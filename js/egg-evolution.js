// js/egg-evolution.js - Hệ thống 12 Con Giáp Việt Nam Chibi Đón Tết (Magic Class 4.0)
const EggEvolution = {
  HATCH_THRESHOLD: 100, // Đạt từ 100 sao trở lên thì trứng sẽ nở thành 1 trong 12 Con Giáp Việt Nam!

  // Danh mục 12 Con Giáp thuần Việt (Đặc biệt: Con giáp thứ 4 là MÈO chứ không phải Thỏ!)
  ZODIACS: [
    { key: 'ty', name: 'Chuột Vàng', quality: 'Lanh Lợi', mascot: '🐭', desc: 'Thông minh, nhanh nhẹn, mang lại tài lộc và may mắn' },
    { key: 'suu', name: 'Trâu Vàng', quality: 'Chăm Chỉ', mascot: '🐮', desc: 'Cần cù, chịu khó, biểu tượng sức mạnh và đức tính kiên trì của người Việt' },
    { key: 'dan', name: 'Hổ Vàng', quality: 'Dũng Mãnh', mascot: '🐯', desc: 'Tự tin, dũng cảm, luôn tiến về phía trước để đạt thành tích cao' },
    { key: 'mao', name: 'Mèo Vàng', quality: 'Thông Minh', mascot: '🐱', desc: 'Đặc trưng thuần Việt 100%, nhanh trí, khéo léo và mang lại vận may' },
    { key: 'thin', name: 'Rồng Vàng', quality: 'Thăng Long', mascot: '🐲', desc: 'Hào khí Thăng Long, uy vũ, hướng đến những ước mơ cao đẹp' },
    { key: 'ty_ran', name: 'Rắn Vàng', quality: 'May Mắn', mascot: '🐍', desc: 'Tinh tế, sâu sắc, biểu tượng của sự may mắn và trường tồn' },
    { key: 'ngo', name: 'Ngựa Vàng', quality: 'Nhanh Nhẹn', mascot: '🐴', desc: 'Nhiệt huyết, năng động, bứt phá tiến bộ từng ngày' },
    { key: 'mui', name: 'Dê Vàng', quality: 'Hiền Hòa', mascot: '🐐', desc: 'Hiền lành, hòa đồng, nhân ái và giàu tình yêu thương bè bạn' },
    { key: 'than', name: 'Khỉ Vàng', quality: 'Khéo Léo', mascot: '🐵', desc: 'Hoạt bát, sáng tạo, giải quyết bài tập khéo léo và thông minh' },
    { key: 'dau', name: 'Gà Vàng', quality: 'Chăm Ngoan', mascot: '🐔', desc: 'Chăm chỉ thức dậy sớm, gương mẫu, đúng giờ và kỷ luật tốt' },
    { key: 'tuat', name: 'Cún Vàng', quality: 'Trung Thành', mascot: '🐶', desc: 'Chân thành, đáng yêu, biết giúp đỡ bạn bè và vâng lời cô giáo' },
    { key: 'hoi', name: 'Heo Vàng', quality: 'Phúc Hậu', mascot: '🐷', desc: 'Mũm mĩm, phúc hậu, luôn vui vẻ mang lại tiếng cười cho cả lớp' }
  ],

  STAGES: [
    {
      level: 0,
      minStars: 0,
      maxStars: 35,
      name: 'Trứng Vàng May Mắn',
      title: 'Đang ấp trứng (0-35 ⭐)',
      isHatched: false,
      desc: 'Quả trứng vàng truyền thống đang được ủ ấm trong đài hoa sen may mắn'
    },
    {
      level: 1,
      minStars: 36,
      maxStars: 70,
      name: 'Trứng Thức Giấc',
      title: 'Trứng cựa quậy (36-70 ⭐)',
      isHatched: false,
      desc: 'Trứng ấm dần lên, tỏa hào quang hoa mai vàng Tết rực rỡ'
    },
    {
      level: 2,
      minStars: 71,
      maxStars: 99,
      name: 'Trứng Nứt Vỏ',
      title: 'Sắp nở rồi! (71-99 ⭐)',
      isHatched: false,
      desc: 'Vỏ nứt tia sáng vàng, bé con giáp bên trong chuẩn bị chào đời!'
    },
    {
      level: 3,
      minStars: 100,
      maxStars: 150,
      name: 'Bé Con Giáp Tí Hon',
      title: '🎉 ĐÃ NỞ! Cấp 1 - Tí Hon (100-150 ⭐)',
      isHatched: true,
      desc: 'Trứng đã nở thành công! Bé con giáp Việt Nam mừng rỡ vẫy chào trong trang phục Tết'
    },
    {
      level: 4,
      minStars: 151,
      maxStars: 220,
      name: 'Con Giáp Tài Lộc',
      title: 'Cấp 2 - Dũng Mãnh (151-220 ⭐)',
      isHatched: true,
      desc: 'Bé con giáp trưởng thành, cầm thỏi vàng may mắn, tỏa hào quang rực rỡ'
    },
    {
      level: 5,
      minStars: 221,
      maxStars: 9999,
      name: 'Con Giáp Hoàng Gia',
      title: 'Cấp 3 - Tối Thượng (>220 ⭐)',
      isHatched: true,
      desc: 'Cấp tối thượng hoàng gia! Đội mũ trạng nguyên / vương miện sen vàng, tỏa kim quang ngũ sắc'
    }
  ],

  // Trợ giúp tính toán mốc nở trứng & chống lạm phát điểm cho học sinh quá giỏi
  getHatchRequirement(student) {
    if (!student) return { threshold: 100, isFastHatcher: false, notice: '' };

    const previousHatchTime = student.firstHatchedAt ||
      (student.lastCompletedGifts && student.lastCompletedGifts[0] && student.lastCompletedGifts[0].timestamp) ||
      student.lastHatchedAt ||
      student.previousHatchedAt ||
      null;

    const isSecondHatch = (student.hatchCount >= 1) ||
      (student.lastCompletedGifts && student.lastCompletedGifts.length > 0) ||
      (student.previousHatchedAt != null);

    if (isSecondHatch && previousHatchTime) {
      const elapsedMs = Date.now() - Number(previousHatchTime);
      const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000; // 3 ngày = 259,200,000 ms

      if (elapsedMs < THREE_DAYS_MS) {
        return {
          threshold: 150,
          isFastHatcher: true,
          notice: 'Trứng đang nâng cấp mời bạn hãy tích luỹ thêm điểm để nở',
          previousHatchTime: Number(previousHatchTime),
          remainingTimeMs: THREE_DAYS_MS - elapsedMs
        };
      }
    }

    return {
      threshold: 100,
      isFastHatcher: false,
      notice: '',
      previousHatchTime: previousHatchTime ? Number(previousHatchTime) : null,
      remainingTimeMs: 0
    };
  },

  getStage(stars, customHatchThreshold = 100) {
    const s = Math.max(0, Number(stars) || 0);
    const targetHatch = customHatchThreshold || this.HATCH_THRESHOLD;

    if (targetHatch > 100 && s < targetHatch) {
      if (s < 50) return this.STAGES[0];
      if (s < 100) return this.STAGES[1];
      return {
        level: 2,
        minStars: 100,
        maxStars: targetHatch - 1,
        name: 'Trứng Nâng Cấp',
        title: `Trứng đang nâng cấp (${s}/${targetHatch} ⭐)`,
        isHatched: false,
        desc: 'Trứng đang nâng cấp mời bạn hãy tích luỹ thêm điểm để nở! Vỏ trứng phát sáng rực rỡ chuẩn bị bung nở'
      };
    }

    for (let i = this.STAGES.length - 1; i >= 0; i--) {
      if (s >= this.STAGES[i].minStars) {
        return this.STAGES[i];
      }
    }
    return this.STAGES[0];
  },

  getNextMilestone(stars, customHatchThreshold = 100) {
    const s = Math.max(0, Number(stars) || 0);
    const targetHatch = customHatchThreshold || this.HATCH_THRESHOLD;
    const current = this.getStage(s, targetHatch);
    const nextIdx = this.STAGES.findIndex(stage => stage.level === current.level) + 1;

    const neededToHatch = s < targetHatch ? (targetHatch - s) : 0;
    const isHatched = s >= targetHatch;

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
        isHatched
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

  // Xác định con giáp Việt Nam tương ứng của học sinh (tự động phân bổ đều 12 con giáp theo ID học sinh)
  getZodiacType(groupId = null, customColor = null, studentId = null) {
    if (studentId) {
      const directMatch = this.ZODIACS.find(z => z.key === String(studentId).toLowerCase());
      if (directMatch) return directMatch.key;

      let hash = 0;
      const str = String(studentId);
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      const idx = Math.abs(hash) % 12;
      return this.ZODIACS[idx].key;
    }
    // Fallback theo Tổ nếu gọi chung chung
    const gId = (groupId !== null && groupId !== undefined) ? Number(String(groupId).replace(/\D/g, '')) || 1 : 1;
    const defaultGroupZodiacs = ['ty', 'suu', 'dan', 'mao'];
    return defaultGroupZodiacs[(gId - 1) % 4];
  },

  // Tên cụ thể của Con Giáp theo Cấp độ tiến hóa
  getCreatureName(stars, groupId = null, customColor = null, studentId = null) {
    const stage = this.getStage(stars);
    if (!stage.isHatched) return stage.name;

    const zKey = this.getZodiacType(groupId, customColor, studentId);
    const zInfo = this.ZODIACS.find(z => z.key === zKey) || this.ZODIACS[0];

    if (stage.level === 3) {
      return `Bé ${zInfo.name} Tí Hon`;
    } else if (stage.level === 4) {
      return `${zInfo.name} ${zInfo.quality}`;
    } else {
      return `${zInfo.name} Hoàng Gia`;
    }
  },

  // =========================================================================
  // BỘ PHÁT SINH HÌNH ẢNH VECTOR SVG 12 CON GIÁP VIỆT NAM (CARTOON CHIBI TẾT)
  // =========================================================================
  renderPetSVG(stars, status = 'active', customColor = null, customHatchThreshold = 100, groupId = null, studentId = null) {
    let color = customColor;
    let threshold = customHatchThreshold;
    let gId = groupId;
    let stId = studentId;

    if (customColor && typeof customColor === 'object') {
      color = customColor.color || null;
      threshold = customColor.hatchThreshold || customHatchThreshold || 100;
      gId = customColor.groupId || customColor.group || groupId;
      stId = customColor.studentId || customColor.id || studentId;
    }

    const stage = this.getStage(stars, threshold);
    const isSleeping = (status === 'sleeping');
    const zKey = this.getZodiacType(gId, color, stId);

    // TRẠNG THÁI 1: ĐANG TĨNH TÂM / ĐI NGỦ 2 PHÚT (ZZZ)
    if (isSleeping) {
      return this._renderSleepingSVG();
    }

    // GIAI ĐOẠN 0: TRỨNG VÀNG MAY MẮN (0 - 35 ⭐)
    if (stage.level === 0) {
      return this._renderEggStage0();
    }

    // GIAI ĐOẠN 1: TRỨNG THỨC GIẤC (36 - 70 ⭐)
    if (stage.level === 1) {
      return this._renderEggStage1();
    }

    // GIAI ĐOẠN 2: TRỨNG NỨT VỎ - SẮP NỞ! (71 - 99 ⭐)
    if (stage.level === 2) {
      return this._renderEggStage2();
    }

    // CÁC GIAI ĐOẠN ĐÃ NỞ THÀNH CÔNG: 12 CON GIÁP VIỆT NAM (100-150⭐, 151-220⭐, >220⭐)
    return this._renderZodiacSVG(zKey, stage.level);
  },

  // Alias tương thích với soibai.js
  getSvg(stars, studentId = null) {
    return this.renderPetSVG(stars, 'active', null, 100, null, studentId);
  },

  // -------------------------------------------------------------------------
  // 1. SVG: TRẠNG THÁI NGỦ TRÊN GỐI MÂY ÊM ÁI (ZZZ)
  // -------------------------------------------------------------------------
  _renderSleepingSVG() {
    return `
      <svg viewBox="0 0 120 120" class="pet-svg sleeping-anim" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="sleepBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FEF08A" />
            <stop offset="60%" stop-color="#FBBF24" />
            <stop offset="100%" stop-color="#F59E0B" />
          </linearGradient>
          <linearGradient id="cloudSleepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFFFFF" />
            <stop offset="100%" stop-color="#E0E7FF" />
          </linearGradient>
          <filter id="sleepGlow">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <!-- Gối mây êm ái -->
        <path d="M 22 96 C 12 96 10 82 20 76 C 16 64 32 58 42 66 C 50 56 68 58 72 68 C 84 66 92 78 88 88 C 96 96 86 104 78 100 C 58 104 38 104 22 96 Z" 
              fill="url(#cloudSleepGrad)" stroke="#CBD5E1" stroke-width="1.8" opacity="0.95"/>
        <path d="M 30 88 Q 42 80 54 86" stroke="#93C5FD" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M 62 86 Q 72 80 82 86" stroke="#C084FC" stroke-width="2" fill="none" stroke-linecap="round"/>
        
        <!-- Thân bé con giáp cuộn tròn ngủ say sưa -->
        <ellipse cx="60" cy="66" rx="30" ry="24" fill="url(#sleepBodyGrad)" stroke="#B45309" stroke-width="2" filter="url(#sleepGlow)"/>
        
        <!-- Đôi tai búp sen gập ngủ hai bên -->
        <path d="M 36 50 C 26 44 24 54 30 60 C 35 64 38 56 36 50 Z" fill="#FB923C" stroke="#B45309" stroke-width="1.5"/>
        <path d="M 84 50 C 94 44 96 54 90 60 C 85 64 82 56 84 50 Z" fill="#FB923C" stroke="#B45309" stroke-width="1.5"/>

        <!-- Đôi mắt nhắm ngủ hình cung ^ ^ cực đáng yêu -->
        <path d="M 46 56 Q 51 61 56 56" stroke="#78350F" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M 64 56 Q 69 61 74 56" stroke="#78350F" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        
        <!-- Đôi má hồng cam đào phúng phính -->
        <ellipse cx="42" cy="63" rx="4.5" ry="3" fill="#FB7185" opacity="0.85"/>
        <ellipse cx="78" cy="63" rx="4.5" ry="3" fill="#FB7185" opacity="0.85"/>

        <!-- Vòng cổ áo yếm đỏ may mắn với chuông vàng -->
        <path d="M 48 72 Q 60 78 72 72" stroke="#EF4444" stroke-width="3.2" fill="none" stroke-linecap="round"/>
        <circle cx="60" cy="77" r="6" fill="#FDE047" stroke="#B45309" stroke-width="1.5"/>
        <line x1="56.5" y1="78.5" x2="63.5" y2="78.5" stroke="#78350F" stroke-width="1.2" stroke-linecap="round"/>

        <!-- Đuôi nhỏ khẽ vắt ngang thân -->
        <path d="M 84 66 C 96 62 100 52 92 48 C 86 46 82 54 84 66 Z" fill="#FB923C" stroke="#B45309" stroke-width="1.5"/>

        <!-- Chùm chữ Zzz bay bổng -->
        <g class="zzz-flight" fill="#8B5CF6" font-family="'Segoe UI', Arial, sans-serif" font-weight="900">
          <text x="88" y="32" font-size="14">Z</text>
          <text x="98" y="22" font-size="11">z</text>
          <text x="105" y="14" font-size="8">z</text>
        </g>
      </svg>
    `;
  },

  // -------------------------------------------------------------------------
  // 2. SVG: TRỨNG VÀNG MAY MẮN (LEVEL 0: 0 - 35 ⭐)
  // -------------------------------------------------------------------------
  _renderEggStage0() {
    return `
      <svg viewBox="0 0 120 120" class="pet-svg egg-wobble" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="eggZod0" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFFBEB" />
            <stop offset="50%" stop-color="#FDE68A" />
            <stop offset="100%" stop-color="#FBBF24" />
          </linearGradient>
          <filter id="eggZodShadow0">
            <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#F59E0B" flood-opacity="0.25"/>
          </filter>
        </defs>
        <!-- Đài hoa sen đỏ viền vàng may mắn -->
        <ellipse cx="60" cy="104" rx="36" ry="10" fill="#FEE2E2" stroke="#DC2626" stroke-width="1.8"/>
        <path d="M 32 102 Q 60 110 88 102" stroke="#B91C1C" stroke-width="2.2" fill="none"/>
        <path d="M 40 106 Q 60 112 80 106" stroke="#DC2626" stroke-width="1.5" fill="none"/>
        
        <!-- Thân vỏ trứng vàng óng ánh -->
        <path d="M 60 16 C 35 16, 25 48, 25 74 C 25 94, 40 102, 60 102 C 80 102, 95 94, 95 74 C 95 48, 85 16, 60 16 Z" 
              fill="url(#eggZod0)" stroke="#D97706" stroke-width="2" filter="url(#eggZodShadow0)"/>
        
        <!-- Đồng tiền vàng may mắn ở giữa trứng -->
        <circle cx="60" cy="58" r="14" fill="#FDE047" stroke="#D97706" stroke-width="1.8"/>
        <rect x="54" y="52" width="12" height="12" rx="1.5" fill="#FEF3C7" stroke="#B45309" stroke-width="1.5"/>
        
        <!-- Đốm hoa mai vàng bay lượn -->
        <circle cx="42" cy="42" r="3.5" fill="#EF4444" opacity="0.8"/>
        <circle cx="78" cy="42" r="3.5" fill="#EF4444" opacity="0.8"/>
        <circle cx="44" cy="76" r="4" fill="#F59E0B" opacity="0.75"/>
        <circle cx="76" cy="76" r="4" fill="#F59E0B" opacity="0.75"/>
        
        <!-- Ánh sáng men ngọc lấp lánh -->
        <path d="M 44 26 C 36 38, 34 52, 36 68" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.9"/>
      </svg>
    `;
  },

  // -------------------------------------------------------------------------
  // 3. SVG: TRỨNG THỨC GIẤC (LEVEL 1: 36 - 70 ⭐)
  // -------------------------------------------------------------------------
  _renderEggStage1() {
    return `
      <svg viewBox="0 0 120 120" class="pet-svg egg-pulse" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="eggZod1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FEF08A" />
            <stop offset="50%" stop-color="#FDBA74" />
            <stop offset="100%" stop-color="#FB7185" />
          </linearGradient>
          <radialGradient id="eggZodAuraMai" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#FDE047" stop-opacity="0.65"/>
            <stop offset="70%" stop-color="#F59E0B" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="#F59E0B" stop-opacity="0"/>
          </radialGradient>
          <filter id="eggZodGlow1">
            <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="#F59E0B" flood-opacity="0.45"/>
          </filter>
        </defs>
        <!-- Hào quang hoa mai vàng tươi rực rỡ đón Tết -->
        <circle cx="60" cy="60" r="54" fill="url(#eggZodAuraMai)"/>
        
        <!-- Đài sen nâng trứng ấm áp -->
        <ellipse cx="60" cy="104" rx="36" ry="10" fill="#FEE2E2" stroke="#DC2626" stroke-width="1.8"/>
        
        <!-- Vỏ trứng rung rinh ấm áp -->
        <path d="M 60 16 C 35 16, 25 48, 25 72 C 25 92, 40 100, 60 100 C 80 100, 95 92, 95 72 C 95 48, 85 16, 60 16 Z" 
              fill="url(#eggZod1)" stroke="#D97706" stroke-width="2" filter="url(#eggZodGlow1)"/>
        
        <!-- Cánh hoa mai vàng nở rộ trên thân trứng -->
        <circle cx="60" cy="60" r="5" fill="#EF4444"/>
        <circle cx="60" cy="52" r="4.5" fill="#FDE047"/>
        <circle cx="68" cy="57" r="4.5" fill="#FDE047"/>
        <circle cx="65" cy="66" r="4.5" fill="#FDE047"/>
        <circle cx="55" cy="66" r="4.5" fill="#FDE047"/>
        <circle cx="52" cy="57" r="4.5" fill="#FDE047"/>

        <!-- Ánh bóng lóa sắc nét -->
        <path d="M 44 26 C 36 38, 34 50, 36 64" stroke="#FFFFFF" stroke-width="4.2" fill="none" stroke-linecap="round" opacity="0.95"/>
        
        <!-- Tia rung rinh cựa quậy chuẩn bị nở -->
        <path d="M 20 66 Q 14 62 20 58" stroke="#F59E0B" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M 100 66 Q 106 62 100 58" stroke="#F59E0B" stroke-width="3" fill="none" stroke-linecap="round"/>
      </svg>
    `;
  },

  // -------------------------------------------------------------------------
  // 4. SVG: TRỨNG NỨT VỎ - SẮP NỞ! (LEVEL 2: 71 - 99 ⭐)
  // -------------------------------------------------------------------------
  _renderEggStage2() {
    return `
      <svg viewBox="0 0 120 120" class="pet-svg egg-pulse" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="eggZod2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FEF08A" />
            <stop offset="45%" stop-color="#FBBF24" />
            <stop offset="100%" stop-color="#EA580C" />
          </linearGradient>
          <filter id="glowGoldZod2">
            <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#FBBF24" flood-opacity="0.85"/>
          </filter>
        </defs>
        <!-- Bóng đất đài sen -->
        <ellipse cx="60" cy="104" rx="36" ry="10" fill="#CBD5E1" opacity="0.7"/>
        
        <!-- Vỏ trứng nứt rực rỡ hào quang -->
        <path d="M 60 16 C 35 16, 25 48, 25 74 C 25 94, 40 102, 60 102 C 80 102, 95 94, 95 74 C 95 48, 85 16, 60 16 Z" 
              fill="url(#eggZod2)" stroke="#B45309" stroke-width="2" filter="url(#glowGoldZod2)"/>
        
        <!-- Vết nứt vỏ sắc nét phát ánh vàng chói lọi -->
        <path d="M 60 20 L 50 36 L 68 46 L 46 62 L 70 72 L 54 88" 
              stroke="#FFFFFF" stroke-width="3.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M 68 46 L 82 54 L 74 68" 
              stroke="#FEF08A" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        
        <!-- Đôi mắt to tròn tò mò của Bé Con Giáp hé nhìn ra -->
        <ellipse cx="58" cy="52" rx="4" ry="5.5" fill="#1E293B"/>
        <circle cx="59.5" cy="50.5" r="1.8" fill="#FFFFFF"/>
        
        <!-- Nhãn SẮP NỞ nổi bật -->
        <rect x="34" y="98" width="52" height="18" rx="9" fill="#DC2626" stroke="#FEF08A" stroke-width="1.5"/>
        <text x="60" y="111" font-size="10" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="0.5">SẮP NỞ!</text>
      </svg>
    `;
  },

  // -------------------------------------------------------------------------
  // 5. SVG BỘ 12 CON GIÁP VIỆT NAM (CHIBI TRANG PHỤC TẾT ĐỎ & VÀNG TRUYỀN THỐNG)
  // -------------------------------------------------------------------------
  _renderZodiacSVG(zKey, level) {
    const isBaby = (level === 3);
    const isMaster = (level === 4);
    const isRoyal = (level >= 5);

    // Phát sinh các bộ phận nhận diện đặc trưng cho từng con giáp
    const features = this._getZodiacFeatures(zKey);

    return `
      <svg viewBox="0 0 120 120" class="pet-svg ${isBaby ? 'baby-bounce' : isMaster ? 'magic-hover' : 'royal-glow'}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="zodGoldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#FEF08A" />
            <stop offset="50%" stop-color="#FBBF24" />
            <stop offset="100%" stop-color="#F59E0B" />
          </linearGradient>
          <linearGradient id="zodRedGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#F87171" />
            <stop offset="50%" stop-color="#EF4444" />
            <stop offset="100%" stop-color="#B91C1C" />
          </linearGradient>
          <linearGradient id="zodCoinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFFBEB" />
            <stop offset="50%" stop-color="#FDE047" />
            <stop offset="100%" stop-color="#D97706" />
          </linearGradient>
          <filter id="zodSoftGlow">
            <feDropShadow dx="0" dy="2" stdDeviation="${isRoyal ? 5 : 3}" flood-color="#F59E0B" flood-opacity="0.45"/>
          </filter>
        </defs>

        ${isRoyal ? `
          <!-- Hào quang hoàng gia Thăng Long rực rỡ -->
          <circle cx="60" cy="60" r="54" stroke="#F59E0B" stroke-width="2.5" stroke-dasharray="6,4" fill="none" opacity="0.85"/>
        ` : ''}

        ${isBaby ? `
          <!-- Hoa giấy confetti chúc mừng nở trứng -->
          <circle cx="18" cy="22" r="3" fill="#EF4444"/>
          <circle cx="102" cy="20" r="3" fill="#F59E0B"/>
          <circle cx="14" cy="48" r="2.5" fill="#10B981"/>
          <circle cx="106" cy="46" r="2.5" fill="#3B82F6"/>
        ` : ''}

        <!-- Đuôi / Bộ phận phía sau đặc trưng của từng con giáp -->
        ${features.backPart || ''}

        ${!isBaby ? `
          <!-- Bệ mây sen và thân mặc Áo Dài / Yếm Đỏ Tết (Level 4, 5) -->
          <ellipse cx="60" cy="102" rx="36" ry="8" fill="#FEE2E2" stroke="#DC2626" stroke-width="1.5"/>
          <ellipse cx="60" cy="80" rx="22" ry="18" fill="url(#zodRedGrad)" stroke="#991B1B" stroke-width="2"/>
          <!-- Viền áo gấm vàng kim -->
          <path d="M 60 68 L 60 88" stroke="#FDE047" stroke-width="2.2" stroke-linecap="round"/>
          <circle cx="60" cy="74" r="2" fill="#FEF08A"/>
          <circle cx="60" cy="82" r="2" fill="#FEF08A"/>
          <!-- Hai chân mũm mĩm -->
          <ellipse cx="44" cy="94" rx="7.5" ry="6" fill="#FBBF24" stroke="#B45309" stroke-width="1.8"/>
          <ellipse cx="76" cy="94" rx="7.5" ry="6" fill="#FBBF24" stroke="#B45309" stroke-width="1.8"/>
        ` : ''}

        <!-- Đôi tai / Sừng phía sau đầu -->
        ${features.earsAndHorns || ''}

        <!-- Đầu tròn Chibi phúng phính đặc trưng -->
        <ellipse cx="60" cy="52" rx="26" ry="22" fill="${features.skinColor || 'url(#zodGoldGrad)'}" stroke="#B45309" stroke-width="2" filter="url(#zodSoftGlow)"/>

        <!-- Họa tiết trán đặc trưng (Sừng/Vằn hổ/Mào gà/Bờm ngựa...) -->
        ${features.forehead || ''}

        ${isRoyal ? `
          <!-- Vương miện hoàng gia hoa sen vàng / Mũ trạng nguyên -->
          <polygon points="46,24 44,8 52,14 60,4 68,14 76,8 74,24" fill="#FBBF24" stroke="#D97706" stroke-width="1.8"/>
          <circle cx="44" cy="8" r="2.2" fill="#EF4444"/>
          <circle cx="60" cy="4" r="2.8" fill="#10B981"/>
          <circle cx="76" cy="8" r="2.2" fill="#3B82F6"/>
        ` : ''}

        <!-- Mõm / Vùng mặt trước -->
        ${features.muzzle || `
          <ellipse cx="60" cy="58" rx="15" ry="10" fill="#FFFBEB" stroke="#FDE047" stroke-width="1.2"/>
          <ellipse cx="60" cy="54" rx="3.5" ry="2.5" fill="#78350F"/>
          <path d="M 54 59 Q 60 63 66 59" stroke="#78350F" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        `}

        <!-- Đôi mắt to tròn đen láy long lanh hai đốm sáng (Chuẩn Anime Chibi) -->
        <ellipse cx="47" cy="47" rx="5.5" ry="7" fill="#1E293B"/>
        <ellipse cx="73" cy="47" rx="5.5" ry="7" fill="#1E293B"/>
        <circle cx="45" cy="44.5" r="2.5" fill="#FFFFFF"/>
        <circle cx="48.5" cy="49" r="1.2" fill="#FFFFFF"/>
        <circle cx="71" cy="44.5" r="2.5" fill="#FFFFFF"/>
        <circle cx="74.5" cy="49" r="1.2" fill="#FFFFFF"/>

        <!-- Đôi má hồng đào phúng phính -->
        <ellipse cx="37" cy="55" rx="4.5" ry="3" fill="#FB7185" opacity="0.85"/>
        <ellipse cx="83" cy="55" rx="4.5" ry="3" fill="#FB7185" opacity="0.85"/>

        <!-- Chi tiết phụ trên mặt (Râu mèo, râu rồng, vằn má...) -->
        ${features.faceExtra || ''}

        ${isBaby ? `
          <!-- Nửa vỏ trứng vàng rực bọc dưới thân cho cấp Tí Hon -->
          <path d="M 28 72 Q 24 104 60 106 Q 96 104 92 72 L 84 80 L 76 72 L 68 81 L 60 73 L 52 81 L 44 73 L 36 80 Z" 
                fill="#FEF08A" stroke="#F59E0B" stroke-width="2.5"/>
          <!-- Hai bàn chân nhỏ xinh tì lên miệng vỏ trứng -->
          <ellipse cx="44" cy="74" rx="6" ry="5" fill="#FDE047" stroke="#B45309" stroke-width="1.8"/>
          <ellipse cx="76" cy="74" rx="6" ry="5" fill="#FDE047" stroke="#B45309" stroke-width="1.8"/>
        ` : `
          <!-- Cầm thỏi vàng / Đồng tiền may mắn đón Tết (Level 4, 5) -->
          <ellipse cx="60" cy="75" rx="10" ry="6.5" fill="url(#zodCoinGrad)" stroke="#B45309" stroke-width="1.5"/>
          <rect x="56" y="72" width="8" height="6" rx="1" fill="#FEF08A" stroke="#B45309" stroke-width="1"/>
          <!-- Hai tay con giáp ôm thỏi vàng -->
          <ellipse cx="48" cy="76" rx="4.5" ry="4" fill="#FDE047" stroke="#B45309" stroke-width="1.5"/>
          <ellipse cx="72" cy="76" rx="4.5" ry="4" fill="#FDE047" stroke="#B45309" stroke-width="1.5"/>
        `}

        <!-- Cổ áo gấm đỏ viền vàng may mắn -->
        <path d="M 44 67 Q 60 74 76 67" stroke="#DC2626" stroke-width="3" fill="none" stroke-linecap="round"/>
        <circle cx="60" cy="71" r="3" fill="#FDE047" stroke="#B45309" stroke-width="1"/>
      </svg>
    `;
  },

  // Trích xuất các nét vẽ đặc trưng không thể nhầm lẫn của từng con giáp trong 12 Con Giáp Việt Nam
  _getZodiacFeatures(zKey) {
    switch (zKey) {
      // 1. TÝ (Chuột Vàng Lanh Lợi)
      case 'ty':
        return {
          earsAndHorns: `
            <circle cx="34" cy="34" r="13" fill="#FBBF24" stroke="#B45309" stroke-width="2"/>
            <circle cx="34" cy="34" r="7.5" fill="#FDA4AF"/>
            <circle cx="86" cy="34" r="13" fill="#FBBF24" stroke="#B45309" stroke-width="2"/>
            <circle cx="86" cy="34" r="7.5" fill="#FDA4AF"/>
          `,
          muzzle: `
            <ellipse cx="60" cy="58" rx="13" ry="9" fill="#FFFBEB" stroke="#FDE047" stroke-width="1.2"/>
            <circle cx="60" cy="54" r="2.8" fill="#F43F5E"/>
            <path d="M 55 58 Q 60 62 65 58" stroke="#78350F" stroke-width="1.8" fill="none" stroke-linecap="round"/>
          `,
          faceExtra: `
            <line x1="32" y1="56" x2="44" y2="56" stroke="#78350F" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="33" y1="60" x2="43" y2="62" stroke="#78350F" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="76" y1="56" x2="88" y2="56" stroke="#78350F" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="77" y1="62" x2="87" y2="60" stroke="#78350F" stroke-width="1.5" stroke-linecap="round"/>
          `,
          backPart: `<path d="M 80 80 Q 98 84 94 66" stroke="#B45309" stroke-width="3" fill="none" stroke-linecap="round"/>`
        };

      // 2. SỬU (Trâu Vàng Chăm Chỉ)
      case 'suu':
        return {
          earsAndHorns: `
            <path d="M 40 38 C 24 26 26 12 36 14 C 42 16 44 28 44 38 Z" fill="#78350F" stroke="#451A03" stroke-width="1.8"/>
            <path d="M 80 38 C 96 26 94 12 84 14 C 78 16 76 28 76 38 Z" fill="#78350F" stroke="#451A03" stroke-width="1.8"/>
            <ellipse cx="28" cy="46" rx="9" ry="5.5" fill="#FBBF24" stroke="#B45309" stroke-width="1.5" transform="rotate(-15 28 46)"/>
            <ellipse cx="92" cy="46" rx="9" ry="5.5" fill="#FBBF24" stroke="#B45309" stroke-width="1.5" transform="rotate(15 92 46)"/>
          `,
          muzzle: `
            <ellipse cx="60" cy="59" rx="16" ry="10" fill="#FEF9C3" stroke="#B45309" stroke-width="1.5"/>
            <ellipse cx="54" cy="57" rx="2" ry="2.5" fill="#78350F"/>
            <ellipse cx="66" cy="57" rx="2" ry="2.5" fill="#78350F"/>
            <path d="M 54 62 Q 60 65 66 62" stroke="#78350F" stroke-width="1.8" fill="none" stroke-linecap="round"/>
            <!-- Vòng mũi vàng may mắn -->
            <circle cx="60" cy="64" r="3.5" stroke="#F59E0B" stroke-width="1.8" fill="none"/>
          `,
          backPart: `<path d="M 82 76 C 94 76 98 66 94 60" stroke="#78350F" stroke-width="3" fill="none" stroke-linecap="round"/>`
        };

      // 3. DẦN (Hổ Vàng Dũng Mãnh)
      case 'dan':
        return {
          earsAndHorns: `
            <circle cx="36" cy="34" r="10.5" fill="#F97316" stroke="#1E293B" stroke-width="2"/>
            <circle cx="36" cy="34" r="5.5" fill="#FEF08A"/>
            <circle cx="84" cy="34" r="10.5" fill="#F97316" stroke="#1E293B" stroke-width="2"/>
            <circle cx="84" cy="34" r="5.5" fill="#FEF08A"/>
          `,
          forehead: `
            <!-- Vằn trán dân gian tự nhiên của Hổ Vàng (chuẩn Tranh Dân Gian Việt Nam, không có chữ Vương) -->
            <path d="M 60 25 L 60 38 M 52 29 Q 57 33 56 37 M 68 29 Q 63 33 64 37" stroke="#1E293B" stroke-width="2.2" stroke-linecap="round" fill="none"/>
          `,
          muzzle: `
            <ellipse cx="60" cy="58" rx="14" ry="9.5" fill="#FFFBEB" stroke="#FDE047" stroke-width="1.2"/>
            <polygon points="56,53 64,53 60,57" fill="#78350F"/>
            <path d="M 53 58 Q 56.5 62 60 59 Q 63.5 62 67 58" stroke="#78350F" stroke-width="1.8" fill="none" stroke-linecap="round"/>
            <!-- Răng nanh sữa tí hon -->
            <polygon points="53,59 55,63 57,59" fill="#FFFFFF"/>
            <polygon points="63,59 65,63 67,59" fill="#FFFFFF"/>
          `,
          faceExtra: `
            <path d="M 32 48 L 40 50 M 34 54 L 42 54" stroke="#1E293B" stroke-width="2" stroke-linecap="round"/>
            <path d="M 88 48 L 80 50 M 86 54 L 78 54" stroke="#1E293B" stroke-width="2" stroke-linecap="round"/>
          `,
          backPart: `<path d="M 82 74 C 98 72 104 60 96 52" stroke="#F97316" stroke-width="4.5" stroke-linecap="round" fill="none"/>`
        };

      // 4. MÃO (MÈO VÀNG THÔNG MINH - ĐẶC TRƯNG VIỆT NAM THAY VÌ THỎ)
      case 'mao':
        return {
          earsAndHorns: `
            <path d="M 36 42 L 26 18 L 48 30 Z" fill="#FBBF24" stroke="#B45309" stroke-width="2"/>
            <polygon points="36,38 30,24 44,31" fill="#FDA4AF"/>
            <path d="M 84 42 L 94 18 L 72 30 Z" fill="#FBBF24" stroke="#B45309" stroke-width="2"/>
            <polygon points="84,38 90,24 76,31" fill="#FDA4AF"/>
          `,
          muzzle: `
            <ellipse cx="60" cy="58" rx="14" ry="9" fill="#FFFBEB" stroke="#FDE047" stroke-width="1.2"/>
            <!-- Mũi hồng trái tim -->
            <path d="M 57 53 Q 60 51 63 53 L 60 57 Z" fill="#F43F5E"/>
            <path d="M 53 58 Q 56.5 62 60 59 Q 63.5 62 67 58" stroke="#78350F" stroke-width="2" fill="none" stroke-linecap="round"/>
            <path d="M 57 60 Q 60 64 63 60 Z" fill="#FB7185"/>
          `,
          faceExtra: `
            <!-- 3 sợi râu mèo mỗi bên má -->
            <line x1="32" y1="54" x2="43" y2="55" stroke="#78350F" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="31" y1="58" x2="42" y2="58" stroke="#78350F" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="33" y1="62" x2="44" y2="61" stroke="#78350F" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="77" y1="55" x2="88" y2="54" stroke="#78350F" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="78" y1="58" x2="89" y2="58" stroke="#78350F" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="76" y1="61" x2="87" y2="62" stroke="#78350F" stroke-width="1.5" stroke-linecap="round"/>
          `,
          backPart: `<path d="M 80 76 C 96 76 102 62 94 56 C 88 52 82 58 84 66" stroke="#FBBF24" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
        };

      // 5. THÌN (RỒNG VÀNG THĂNG LONG)
      case 'thin':
        return {
          earsAndHorns: `
            <path d="M 44 32 C 38 18 46 14 50 20 C 52 24 48 30 46 34 Z" fill="#FDE047" stroke="#B45309" stroke-width="1.8"/>
            <path d="M 76 32 C 82 18 74 14 70 20 C 68 24 72 30 74 34 Z" fill="#FDE047" stroke="#B45309" stroke-width="1.8"/>
          `,
          forehead: `
            <path d="M 48 26 C 52 14 60 10 64 16 C 68 12 72 16 70 26 Z" fill="#DC2626" stroke="#991B1B" stroke-width="1.5"/>
          `,
          muzzle: `
            <ellipse cx="60" cy="56" rx="16" ry="11" fill="#FEF9C3" stroke="#FDE047" stroke-width="1.5"/>
            <circle cx="56" cy="53" r="1.5" fill="#78350F"/>
            <circle cx="64" cy="53" r="1.5" fill="#78350F"/>
            <path d="M 53 58 Q 60 63 67 58" stroke="#78350F" stroke-width="2" fill="none" stroke-linecap="round"/>
          `,
          faceExtra: `
            <!-- Râu rồng chữ S Thăng Long -->
            <path d="M 45 54 C 30 50 24 64 34 66" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round" fill="none"/>
            <path d="M 75 54 C 90 50 96 64 86 66" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round" fill="none"/>
          `,
          backPart: `
            <path d="M 76 80 C 96 82 108 68 98 56 C 90 48 84 56 86 66 C 88 72 82 76 76 80" fill="url(#zodGoldGrad)" stroke="#B45309" stroke-width="2"/>
            <path d="M 98 56 C 106 48 110 56 104 62 Z" fill="#DC2626"/>
          `
        };

      // 6. TỴ (RẮN VÀNG MAY MẮN)
      case 'ty_ran':
        return {
          forehead: `
            <!-- Chiếc mũ nơ đỏ may mắn -->
            <polygon points="52,30 60,16 68,30" fill="#DC2626" stroke="#B91C1C" stroke-width="1.2"/>
            <circle cx="60" cy="15" r="2.8" fill="#FDE047"/>
          `,
          muzzle: `
            <ellipse cx="60" cy="58" rx="14" ry="9" fill="#FFFBEB" stroke="#FDE047" stroke-width="1.2"/>
            <ellipse cx="60" cy="54" rx="2.5" ry="2" fill="#78350F"/>
            <!-- Lưỡi thè ra tinh nghịch -->
            <path d="M 60 58 L 60 64 L 58 67 M 60 64 L 62 67" stroke="#F43F5E" stroke-width="1.8" stroke-linecap="round"/>
          `,
          backPart: `<path d="M 78 76 C 94 72 100 60 92 52 C 86 48 82 56 86 64" stroke="#F59E0B" stroke-width="5" stroke-linecap="round" fill="none"/>`
        };

      // 7. NGỌ (NGỰA VÀNG NHANH NHẸN)
      case 'ngo':
        return {
          earsAndHorns: `
            <path d="M 42 36 L 38 18 L 48 28 Z" fill="#FBBF24" stroke="#B45309" stroke-width="2"/>
            <path d="M 78 36 L 82 18 L 72 28 Z" fill="#FBBF24" stroke="#B45309" stroke-width="2"/>
          `,
          forehead: `
            <path d="M 46 24 C 50 14 60 12 64 20 C 68 14 74 18 72 28 Z" fill="#DC2626" stroke="#991B1B" stroke-width="1.5"/>
          `,
          muzzle: `
            <ellipse cx="60" cy="58" rx="14" ry="9.5" fill="#FEF9C3" stroke="#B45309" stroke-width="1.5"/>
            <circle cx="55" cy="56" r="1.5" fill="#78350F"/>
            <circle cx="65" cy="56" r="1.5" fill="#78350F"/>
            <path d="M 54 61 Q 60 65 66 61" stroke="#78350F" stroke-width="1.8" fill="none" stroke-linecap="round"/>
          `,
          backPart: `<path d="M 82 74 C 98 70 102 58 94 50" stroke="#DC2626" stroke-width="4" stroke-linecap="round" fill="none"/>`
        };

      // 8. MÙI (DÊ VÀNG HIỀN HÒA)
      case 'mui':
        return {
          earsAndHorns: `
            <path d="M 42 34 C 32 20 42 12 48 22 Z" fill="#F59E0B" stroke="#B45309" stroke-width="1.8"/>
            <path d="M 78 34 C 88 20 78 12 72 22 Z" fill="#F59E0B" stroke="#B45309" stroke-width="1.8"/>
            <ellipse cx="30" cy="46" rx="8" ry="5" fill="#FBBF24" stroke="#B45309" stroke-width="1.5" transform="rotate(25 30 46)"/>
            <ellipse cx="90" cy="46" rx="8" ry="5" fill="#FBBF24" stroke="#B45309" stroke-width="1.5" transform="rotate(-25 90 46)"/>
          `,
          muzzle: `
            <ellipse cx="60" cy="58" rx="13" ry="9" fill="#FFFBEB" stroke="#FDE047" stroke-width="1.2"/>
            <ellipse cx="60" cy="54" rx="3" ry="2" fill="#78350F"/>
            <path d="M 54 59 Q 60 63 66 59" stroke="#78350F" stroke-width="1.8" fill="none" stroke-linecap="round"/>
            <!-- Chòm râu dê tí hon siêu dễ thương -->
            <path d="M 58 63 L 62 63 L 60 69 Z" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
          `,
          backPart: `<circle cx="86" cy="74" r="5" fill="#FBBF24" stroke="#B45309" stroke-width="1.5"/>`
        };

      // 9. THÂN (KHỈ VÀNG KHÉO LÉO)
      case 'than':
        return {
          earsAndHorns: `
            <circle cx="28" cy="50" r="11" fill="#FBBF24" stroke="#B45309" stroke-width="2"/>
            <circle cx="28" cy="50" r="6" fill="#FDA4AF"/>
            <circle cx="92" cy="50" r="11" fill="#FBBF24" stroke="#B45309" stroke-width="2"/>
            <circle cx="92" cy="50" r="6" fill="#FDA4AF"/>
          `,
          muzzle: `
            <path d="M 46 42 C 40 38 38 48 46 56 C 54 64 66 64 74 56 C 82 48 80 38 74 42 C 68 46 64 44 60 42 C 56 44 52 46 46 42 Z" fill="#FEF9C3" stroke="#FDE047" stroke-width="1.5"/>
            <ellipse cx="60" cy="53" rx="3" ry="2" fill="#78350F"/>
            <path d="M 52 58 Q 60 64 68 58" stroke="#78350F" stroke-width="2" fill="none" stroke-linecap="round"/>
          `,
          backPart: `<path d="M 80 78 C 96 82 106 68 98 56 C 92 48 86 58 90 66" stroke="#B45309" stroke-width="3" fill="none" stroke-linecap="round"/>`
        };

      // 10. DẬU (GÀ VÀNG CHĂM NGOAN)
      case 'dau':
        return {
          forehead: `
            <!-- Chiếc mào gà đỏ thắm hoa mai -->
            <path d="M 48 30 C 46 16 54 14 58 22 C 62 12 70 14 70 24 C 74 20 78 22 76 30 Z" fill="#DC2626" stroke="#991B1B" stroke-width="1.8"/>
          `,
          muzzle: `
            <!-- Mỏ chim vàng & tích gà đỏ -->
            <polygon points="56,53 60,61 64,53" fill="#F59E0B" stroke="#B45309" stroke-width="1.5"/>
            <path d="M 58 61 C 56 67 64 67 62 61 Z" fill="#DC2626"/>
          `,
          backPart: `
            <!-- Lông đuôi gà trống ngũ sắc xòe cao -->
            <path d="M 76 76 C 92 68 104 52 98 40 C 90 44 86 58 78 70" fill="#DC2626" stroke="#991B1B" stroke-width="1.5"/>
            <path d="M 78 78 C 96 74 106 62 102 52" stroke="#F59E0B" stroke-width="2.5" fill="none"/>
          `
        };

      // 11. TUẤT (CÚN VÀNG TRUNG THÀNH)
      case 'tuat':
        return {
          earsAndHorns: `
            <path d="M 40 40 C 24 30 20 46 28 56 C 34 62 40 54 38 42 Z" fill="#EA580C" stroke="#9A3412" stroke-width="2"/>
            <path d="M 80 40 C 96 30 100 46 92 56 C 86 62 80 54 82 42 Z" fill="#EA580C" stroke="#9A3412" stroke-width="2"/>
          `,
          muzzle: `
            <ellipse cx="60" cy="58" rx="14" ry="9" fill="#FFFBEB" stroke="#FDE047" stroke-width="1.2"/>
            <ellipse cx="60" cy="53" rx="4" ry="3" fill="#78350F"/>
            <path d="M 53 58 Q 56.5 62 60 59 Q 63.5 62 67 58" stroke="#78350F" stroke-width="2" fill="none" stroke-linecap="round"/>
            <path d="M 57 60 Q 60 65 63 60 Z" fill="#FB7185"/>
          `,
          backPart: `<path d="M 82 74 C 96 70 102 58 96 52 C 90 48 86 56 88 64" stroke="#EA580C" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
        };

      // 12. HỢI (HEO VÀNG PHÚC HẬU)
      case 'hoi':
      default:
        return {
          skinColor: 'url(#zodGoldGrad)',
          earsAndHorns: `
            <path d="M 38 38 L 28 20 L 48 26 Z" fill="#FDA4AF" stroke="#E11D48" stroke-width="2"/>
            <path d="M 82 38 L 92 20 L 72 26 Z" fill="#FDA4AF" stroke="#E11D48" stroke-width="2"/>
          `,
          muzzle: `
            <!-- Chiếc mũi heo đặc trưng không thể nhầm lẫn -->
            <ellipse cx="60" cy="56" rx="12" ry="8.5" fill="#FDA4AF" stroke="#E11D48" stroke-width="2"/>
            <ellipse cx="56" cy="56" rx="2.2" ry="3.2" fill="#BE123C"/>
            <ellipse cx="64" cy="56" rx="2.2" ry="3.2" fill="#BE123C"/>
            <path d="M 54 62 Q 60 66 66 62" stroke="#78350F" stroke-width="1.8" fill="none" stroke-linecap="round"/>
          `,
          backPart: `<path d="M 80 76 Q 94 76 92 68 Q 90 62 96 64" stroke="#E11D48" stroke-width="2.5" fill="none" stroke-linecap="round"/>`
        };
    }
  }
};

if (typeof window !== 'undefined') {
  window.EggEvolution = EggEvolution;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EggEvolution;
}
