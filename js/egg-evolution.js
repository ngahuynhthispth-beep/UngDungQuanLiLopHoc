// js/egg-evolution.js - Hệ thống Tiến hóa Linh Thú Dân Gian Việt Nam (Magic Class 4.0)
const EggEvolution = {
  HATCH_THRESHOLD: 100, // Đạt từ 100 sao trở lên thì trứng sẽ nở thành Linh Thú Dân Gian!

  STAGES: [
    {
      level: 0,
      minStars: 0,
      maxStars: 35,
      name: 'Trứng Thần Đông Sơn',
      title: 'Đang ấp trứng (0-35 ⭐)',
      isHatched: false,
      desc: 'Quả trứng thần đang được ủ ấm trong đài sen rơm, tích lũy tinh hoa đất trời'
    },
    {
      level: 1,
      minStars: 36,
      maxStars: 70,
      name: 'Trứng Thức Giấc',
      title: 'Trứng cựa quậy (36-70 ⭐)',
      isHatched: false,
      desc: 'Trứng ấm lên rực rỡ, tỏa ánh sáng hoa văn mây cuộn Đông Sơn ấm áp'
    },
    {
      level: 2,
      minStars: 71,
      maxStars: 99,
      name: 'Trứng Nứt Vỏ',
      title: 'Sắp nở rồi! (71-99 ⭐)',
      isHatched: false,
      desc: 'Vỏ nứt tia vàng rực rỡ, linh thú dân gian bên trong cựa mình chuẩn bị chào đời!'
    },
    {
      level: 3,
      minStars: 100,
      maxStars: 150,
      name: 'Linh Thú Dân Gian (Tí Hon)',
      title: '🎉 ĐÃ NỞ! Cấp 1 - Tí Hon (100-150 ⭐)',
      isHatched: true,
      desc: 'Trứng đã nở thành công! Linh thú thuần Việt chào đời với bờm mây may mắn, cười tít mắt'
    },
    {
      level: 4,
      minStars: 151,
      maxStars: 220,
      name: 'Linh Thú Thần Thoại',
      title: 'Cấp 2 - Dũng Mãnh (151-220 ⭐)',
      isHatched: true,
      desc: 'Linh thú lớn nhanh, mọc bờm mây lửa, ngậm ngọc minh châu rực sáng'
    },
    {
      level: 5,
      minStars: 221,
      maxStars: 9999,
      name: 'Thần Thú Thăng Long Hoàng Gia',
      title: 'Cấp 3 - Tối Thượng (>220 ⭐)',
      isHatched: true,
      desc: 'Đạt cấp độ tối thượng hoàng gia! Đội vương miện sen vàng, tỏa hào quang rực rỡ bảng vàng'
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

    // Nếu học sinh thuộc diện tăng lên 150 sao mới nở và hiện tại < 150 sao: hiển thị trứng nâng cấp
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

  // Xác định loài linh thú dân gian Việt Nam dựa theo Tổ hoặc màu sắc
  getCultCreatureType(groupId, customColor, studentId) {
    const gId = (groupId !== null && groupId !== undefined) ? String(groupId).trim() : '';
    const color = (customColor || '').toUpperCase();

    if (gId === '1' || gId.includes('1') || color === '#FF6B6B') {
      return 'chim_lac'; // Tổ 1: Chim Lạc Đông Sơn (Hào khí, khát vọng vươn cao)
    }
    if (gId === '2' || gId.includes('2') || color === '#4ECDC4') {
      return 'nghe_than'; // Tổ 2: Nghê Thần May Mắn (Thuần Việt, tinh nghịch, bảo hộ bình an)
    }
    if (gId === '3' || gId.includes('3') || color === '#FFA07A') {
      return 'kim_quy'; // Tổ 3: Rùa Vàng Kim Quy (Bền bỉ, trí tuệ sâu rộng)
    }
    if (gId === '4' || gId.includes('4') || color === '#96CEB4') {
      return 'rong_vang'; // Tổ 4: Rồng Vàng Thăng Long (Rồng thời Lý mềm mại, thăng hoa bảng vàng)
    }
    if (studentId) {
      const hash = String(studentId).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const types = ['chim_lac', 'nghe_than', 'kim_quy', 'rong_vang'];
      return types[hash % types.length];
    }
    return 'nghe_than';
  },

  // Tên cụ thể của Linh thú dân gian theo Cấp độ và Tổ
  getCreatureName(stars, groupId = null, customColor = null, studentId = null) {
    const stage = this.getStage(stars);
    if (!stage.isHatched) return stage.name;

    const type = this.getCultCreatureType(groupId, customColor, studentId);
    const names = {
      chim_lac: {
        3: 'Bé Chim Lạc Tí Hon',
        4: 'Chim Lạc Lửa Đông Sơn',
        5: 'Lạc Thần Hoàng Gia Đông Sơn'
      },
      nghe_than: {
        3: 'Bé Nghê Con May Mắn',
        4: 'Nghê Thần Phép Thuật',
        5: 'Đại Nghê Thần Hoàng Gia'
      },
      kim_quy: {
        3: 'Bé Kim Quy Tí Hon',
        4: 'Rùa Vàng Kim Quy Trí Tuệ',
        5: 'Thần Kim Quy Hoàng Gia'
      },
      rong_vang: {
        3: 'Bé Rồng Vàng Tí Hon',
        4: 'Thần Long Thăng Long',
        5: 'Thần Long Hoàng Gia Thời Lý'
      }
    };

    return (names[type] && names[type][stage.level]) || stage.name;
  },

  // =========================================================================
  // BỘ PHÁT SINH HÌNH ẢNH VECTOR SVG LINH THÚ DÂN GIAN VIỆT NAM (CARTOON CHIBI)
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
    const creatureType = this.getCultCreatureType(gId, color, stId);

    // TRẠNG THÁI 1: ĐANG TĨNH TÂM / ĐI NGỦ 2 PHÚT (ZZZ)
    if (isSleeping) {
      return this._renderSleepingSVG();
    }

    // GIAI ĐOẠN 0: TRỨNG THẦN ĐÔNG SƠN (0 - 35 ⭐)
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

    // CÁC GIAI ĐOẠN ĐÃ NỞ THÀNH CÔNG (CẤP 1: 100-150⭐, CẤP 2: 151-220⭐, CẤP 3: >220⭐)
    if (creatureType === 'chim_lac') {
      return this._renderChimLacSVG(stage.level);
    } else if (creatureType === 'kim_quy') {
      return this._renderKimQuySVG(stage.level);
    } else if (creatureType === 'rong_vang') {
      return this._renderRongVangSVG(stage.level);
    } else {
      return this._renderNgheThanSVG(stage.level);
    }
  },

  // Alias tương thích với soibai.js
  getSvg(stars, studentId = null) {
    return this.renderPetSVG(stars, 'active', null, 100, null, studentId);
  },

  // -------------------------------------------------------------------------
  // 1. SVG: TRẠNG THÁI NGỦ TRÊN MÂY NGŨ SẮC DÂN GIAN (ZZZ)
  // -------------------------------------------------------------------------
  _renderSleepingSVG() {
    return `
      <svg viewBox="0 0 120 120" class="pet-svg sleeping-anim" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="sleepFolkloreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FEF08A" />
            <stop offset="60%" stop-color="#FBBF24" />
            <stop offset="100%" stop-color="#F59E0B" />
          </linearGradient>
          <linearGradient id="cloudFolkloreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFFFFF" />
            <stop offset="100%" stop-color="#E0E7FF" />
          </linearGradient>
          <filter id="folkloreSoftGlow">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <!-- Áng mây ngũ sắc êm ái làm gối ngủ -->
        <path d="M 22 96 C 12 96 10 82 20 76 C 16 64 32 58 42 66 C 50 56 68 58 72 68 C 84 66 92 78 88 88 C 96 96 86 104 78 100 C 58 104 38 104 22 96 Z" 
              fill="url(#cloudFolkloreGrad)" stroke="#CBD5E1" stroke-width="1.8" opacity="0.95"/>
        <path d="M 30 88 Q 42 80 54 86" stroke="#93C5FD" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M 62 86 Q 72 80 82 86" stroke="#C084FC" stroke-width="2" fill="none" stroke-linecap="round"/>
        
        <!-- Thân bé linh thú cuộn tròn ngủ ngoan mũm mĩm -->
        <ellipse cx="60" cy="66" rx="30" ry="24" fill="url(#sleepFolkloreGrad)" stroke="#B45309" stroke-width="2" filter="url(#folkloreSoftGlow)"/>
        
        <!-- Đôi tai búp sen gập ngủ hai bên -->
        <path d="M 36 50 C 26 44 24 54 30 60 C 35 64 38 56 36 50 Z" fill="#FB923C" stroke="#B45309" stroke-width="1.5"/>
        <path d="M 84 50 C 94 44 96 54 90 60 C 85 64 82 56 84 50 Z" fill="#FB923C" stroke="#B45309" stroke-width="1.5"/>

        <!-- Bờm mây xoắn thời Lý xinh xắn trên trán -->
        <path d="M 54 44 C 52 36 66 34 68 42 C 68 46 62 48 58 48 Z" fill="#FB923C" stroke="#B45309" stroke-width="1.5"/>

        <!-- Đôi mắt nhắm ngủ hình cung ^ ^ cực đáng yêu -->
        <path d="M 46 56 Q 51 61 56 56" stroke="#78350F" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M 64 56 Q 69 61 74 56" stroke="#78350F" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        
        <!-- Đôi má hồng cam đào phúng phính -->
        <ellipse cx="42" cy="63" rx="4.5" ry="3" fill="#FB7185" opacity="0.85"/>
        <ellipse cx="78" cy="63" rx="4.5" ry="3" fill="#FB7185" opacity="0.85"/>

        <!-- Vòng chỉ đỏ đeo lục lạc vàng chuông leng keng -->
        <path d="M 48 72 Q 60 78 72 72" stroke="#EF4444" stroke-width="3" fill="none" stroke-linecap="round"/>
        <circle cx="60" cy="77" r="6" fill="#FDE047" stroke="#B45309" stroke-width="1.5"/>
        <line x1="56.5" y1="78.5" x2="63.5" y2="78.5" stroke="#78350F" stroke-width="1.2" stroke-linecap="round"/>

        <!-- Đuôi xòe búp sen khẽ vắt ngang thân -->
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
  // 2. SVG: TRỨNG THẦN ĐÔNG SƠN (LEVEL 0: 0 - 35 ⭐)
  // -------------------------------------------------------------------------
  _renderEggStage0() {
    return `
      <svg viewBox="0 0 120 120" class="pet-svg egg-wobble" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="eggDongSon0" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFE4E6" />
            <stop offset="50%" stop-color="#FED7AA" />
            <stop offset="100%" stop-color="#FDE68A" />
          </linearGradient>
          <filter id="eggShadow0">
            <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#F59E0B" flood-opacity="0.25"/>
          </filter>
        </defs>
        <!-- Đài hoa sen rơm vàng dân gian -->
        <ellipse cx="60" cy="104" rx="36" ry="10" fill="#FEF08A" stroke="#F59E0B" stroke-width="1.5"/>
        <path d="M 32 102 Q 60 110 88 102" stroke="#D97706" stroke-width="2.2" fill="none"/>
        <path d="M 40 106 Q 60 112 80 106" stroke="#F59E0B" stroke-width="1.5" fill="none"/>
        
        <!-- Thân vỏ trứng thần màu men gốm Việt -->
        <path d="M 60 16 C 35 16, 25 48, 25 74 C 25 94, 40 102, 60 102 C 80 102, 95 94, 95 74 C 95 48, 85 16, 60 16 Z" 
              fill="url(#eggDongSon0)" filter="url(#eggShadow0)"/>
        
        <!-- Họa tiết hoa văn mặt trời Đông Sơn và mây cuộn mềm mại -->
        <circle cx="60" cy="58" r="14" fill="none" stroke="#F97316" stroke-width="1.5" stroke-dasharray="3,2" opacity="0.6"/>
        <circle cx="60" cy="58" r="7" fill="#F97316" opacity="0.3"/>
        
        <!-- Đốm hoa văn mây dân gian xung quanh trứng -->
        <path d="M 40 45 Q 46 40 50 45 Q 46 50 40 45 Z" fill="#FB7185" opacity="0.75"/>
        <path d="M 72 45 Q 76 40 82 45 Q 76 50 72 45 Z" fill="#FB7185" opacity="0.75"/>
        <circle cx="44" cy="74" r="5" fill="#38BDF8" opacity="0.65"/>
        <circle cx="76" cy="74" r="5.5" fill="#A855F7" opacity="0.65"/>
        
        <!-- Vệt ánh sáng lóa mắt tráng men tinh xảo -->
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
          <linearGradient id="eggDongSon1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FEF08A" />
            <stop offset="60%" stop-color="#FDBA74" />
            <stop offset="100%" stop-color="#FB7185" />
          </linearGradient>
          <radialGradient id="eggAuraMai" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#FDE047" stop-opacity="0.6"/>
            <stop offset="70%" stop-color="#F59E0B" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="#F59E0B" stop-opacity="0"/>
          </radialGradient>
          <filter id="eggGlow1">
            <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="#F59E0B" flood-opacity="0.45"/>
          </filter>
        </defs>
        <!-- Hào quang hoa mai vàng tươi rực rỡ -->
        <circle cx="60" cy="60" r="54" fill="url(#eggAuraMai)"/>
        
        <!-- Đài sen nâng trứng ấm áp -->
        <ellipse cx="60" cy="104" rx="36" ry="10" fill="#FEF08A" stroke="#D97706" stroke-width="1.8"/>
        
        <!-- Vỏ trứng rung rinh ấm áp -->
        <path d="M 60 16 C 35 16, 25 48, 25 72 C 25 92, 40 100, 60 100 C 80 100, 95 92, 95 72 C 95 48, 85 16, 60 16 Z" 
              fill="url(#eggDongSon1)" filter="url(#eggGlow1)"/>
        
        <!-- Trái tim tình bạn & hoa mai bay lượn -->
        <circle cx="28" cy="40" r="3.5" fill="#EF4444" opacity="0.85"/>
        <circle cx="92" cy="38" r="4" fill="#F59E0B" opacity="0.9"/>
        <path d="M 32 30 Q 35 25 38 30 Q 35 35 32 30 Z" fill="#F43F5E"/>
        <path d="M 88 28 Q 91 23 94 28 Q 91 33 88 28 Z" fill="#FBBF24"/>

        <!-- Họa tiết mây cuộn dân gian phát sáng trên thân trứng -->
        <path d="M 48 48 Q 60 42 72 48 Q 60 54 48 48 Z" fill="#FFFFFF" opacity="0.75"/>
        <circle cx="60" cy="64" r="8" fill="#FFFFFF" opacity="0.7"/>
        <circle cx="48" cy="72" r="5" fill="#FDE047" opacity="0.8"/>
        <circle cx="72" cy="72" r="5" fill="#FDE047" opacity="0.8"/>

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
          <linearGradient id="eggDongSon2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FEF08A" />
            <stop offset="45%" stop-color="#FBBF24" />
            <stop offset="100%" stop-color="#EA580C" />
          </linearGradient>
          <filter id="glowGoldViet2">
            <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#FBBF24" flood-opacity="0.85"/>
          </filter>
        </defs>
        <!-- Bóng đất đài sen -->
        <ellipse cx="60" cy="104" rx="36" ry="10" fill="#CBD5E1" opacity="0.7"/>
        
        <!-- Vỏ trứng nứt rực rỡ hào quang -->
        <path d="M 60 16 C 35 16, 25 48, 25 74 C 25 94, 40 102, 60 102 C 80 102, 95 94, 95 74 C 95 48, 85 16, 60 16 Z" 
              fill="url(#eggDongSon2)" filter="url(#glowGoldViet2)"/>
        
        <!-- Vết nứt vỏ sắc nét phát ánh vàng chói lọi -->
        <path d="M 60 20 L 50 36 L 68 46 L 46 62 L 70 72 L 54 88" 
              stroke="#FFFFFF" stroke-width="3.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M 68 46 L 82 54 L 74 68" 
              stroke="#FEF08A" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        
        <!-- Tia sáng linh khí phát ra từ khe nứt -->
        <circle cx="54" cy="38" r="3.5" fill="#FFFFFF"/>
        <circle cx="48" cy="64" r="3.5" fill="#FFFFFF"/>
        <circle cx="76" cy="58" r="3.5" fill="#FFFFFF"/>
        
        <!-- Đôi mắt to tròn tò mò của Linh Thú hé nhìn ra -->
        <ellipse cx="58" cy="52" rx="4" ry="5.5" fill="#1E293B"/>
        <circle cx="59.5" cy="50.5" r="1.8" fill="#FFFFFF"/>
        
        <!-- Nhãn SẮP NỞ nổi bật -->
        <rect x="34" y="98" width="52" height="18" rx="9" fill="#DC2626" stroke="#FEF08A" stroke-width="1.5"/>
        <text x="60" y="111" font-size="10" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="0.5">SẮP NỞ!</text>
      </svg>
    `;
  },

  // -------------------------------------------------------------------------
  // 5. SVG: BÉ NGHÊ THẦN MAY MẮN (TỔ 2 - CÚN THẦN THUẦN VIỆT, CHUÔNG VÀNG, MẶT CƯỜI SIÊU DỄ THƯƠNG)
  // -------------------------------------------------------------------------
  _renderNgheThanSVG(level) {
    const isBaby = (level === 3);
    const isMaster = (level === 4);
    const isRoyal = (level >= 5);

    return `
      <svg viewBox="0 0 120 120" class="pet-svg ${isBaby ? 'baby-bounce' : isMaster ? 'magic-hover' : 'royal-glow'}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ngheBody" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#FEF08A" />
            <stop offset="60%" stop-color="#FBBF24" />
            <stop offset="100%" stop-color="#F59E0B" />
          </linearGradient>
          <linearGradient id="ngheEarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FB923C" />
            <stop offset="100%" stop-color="#EA580C" />
          </linearGradient>
          <linearGradient id="ngheBell" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFFBEB" />
            <stop offset="40%" stop-color="#FDE047" />
            <stop offset="100%" stop-color="#D97706" />
          </linearGradient>
          <filter id="ngheSoftGlow">
            <feDropShadow dx="0" dy="2" stdDeviation="${isRoyal ? 5 : 3}" flood-color="#F59E0B" flood-opacity="0.45"/>
          </filter>
        </defs>

        ${isRoyal ? `
          <!-- Hào quang kim quang ngũ sắc cho Nghê Hoàng Gia -->
          <circle cx="60" cy="60" r="54" stroke="#F59E0B" stroke-width="2.5" stroke-dasharray="6,4" fill="none" opacity="0.85"/>
        ` : ''}

        ${isBaby ? `
          <!-- Hoa giấy confetti chúc mừng bé nở trứng -->
          <circle cx="18" cy="22" r="3" fill="#EF4444"/>
          <circle cx="102" cy="20" r="3" fill="#F59E0B"/>
          <circle cx="14" cy="48" r="2.5" fill="#10B981"/>
          <circle cx="106" cy="46" r="2.5" fill="#3B82F6"/>
        ` : ''}

        <!-- Đuôi búp sen xoăn mây vẫy vui vẻ bên hông -->
        <path d="M 82 72 C 98 70 106 54 96 46 C 88 40 82 48 84 58 C 85 64 80 68 76 72" 
              fill="url(#ngheEarGrad)" stroke="#B45309" stroke-width="2" stroke-linecap="round"/>
        <path d="M 94 48 C 96 52 92 56 88 56" stroke="#FEF08A" stroke-width="1.5" fill="none" stroke-linecap="round"/>

        ${!isBaby ? `
          <!-- Thân ngồi mũm mĩm đáng yêu (Level 4, 5) -->
          <ellipse cx="60" cy="80" rx="22" ry="18" fill="url(#ngheBody)" stroke="#B45309" stroke-width="2"/>
          <ellipse cx="60" cy="82" rx="14" ry="12" fill="#FFFBEB"/>
          <!-- Hai bàn chân trước tròn xoe bụ bẫm -->
          <ellipse cx="46" cy="94" rx="7.5" ry="6.5" fill="#FDE047" stroke="#B45309" stroke-width="1.8"/>
          <ellipse cx="74" cy="94" rx="7.5" ry="6.5" fill="#FDE047" stroke="#B45309" stroke-width="1.8"/>
          <circle cx="43" cy="96" r="1.5" fill="#B45309"/>
          <circle cx="46" cy="97" r="1.5" fill="#B45309"/>
          <circle cx="49" cy="96" r="1.5" fill="#B45309"/>
          <circle cx="71" cy="96" r="1.5" fill="#B45309"/>
          <circle cx="74" cy="97" r="1.5" fill="#B45309"/>
          <circle cx="77" cy="96" r="1.5" fill="#B45309"/>
        ` : ''}

        <!-- Đôi tai búp sen vểnh cụp siêu đáng yêu -->
        <!-- Tai trái -->
        <path d="M 40 40 C 24 30 20 46 28 56 C 34 62 40 54 38 42 Z" 
              fill="url(#ngheEarGrad)" stroke="#B45309" stroke-width="2"/>
        <path d="M 36 44 C 28 38 26 48 31 53" fill="#FDE047" opacity="0.6"/>
        <!-- Tai phải -->
        <path d="M 80 40 C 96 30 100 46 92 56 C 86 62 80 54 82 42 Z" 
              fill="url(#ngheEarGrad)" stroke="#B45309" stroke-width="2"/>
        <path d="M 84 44 C 92 38 94 48 89 53" fill="#FDE047" opacity="0.6"/>

        <!-- Đầu Nghê Con Chibi tròn xoe bụ bẫm -->
        <ellipse cx="60" cy="52" rx="26" ry="22" fill="url(#ngheBody)" stroke="#B45309" stroke-width="2" filter="url(#ngheSoftGlow)"/>

        <!-- Bờm mây xoắn thời Lý duyên dáng trên đỉnh đầu -->
        <path d="M 52 32 C 50 20 68 18 70 28 C 70 33 62 35 58 35 Z" 
              fill="url(#ngheEarGrad)" stroke="#B45309" stroke-width="1.8"/>
        <path d="M 64 26 C 64 23 59 23 57 26 C 56 28 58 30 60 30" 
              stroke="#FEF08A" stroke-width="1.5" fill="none" stroke-linecap="round"/>

        ${isRoyal ? `
          <!-- Vương miện hoa sen hoàng gia Thăng Long -->
          <polygon points="46,24 44,8 52,14 60,4 68,14 76,8 74,24" fill="#FBBF24" stroke="#D97706" stroke-width="1.8"/>
          <circle cx="44" cy="8" r="2.2" fill="#EF4444"/>
          <circle cx="60" cy="4" r="2.8" fill="#10B981"/>
          <circle cx="76" cy="8" r="2.2" fill="#3B82F6"/>
        ` : ''}

        <!-- Mõm tròn phúng phính màu sữa -->
        <ellipse cx="60" cy="58" rx="15" ry="10" fill="#FFFBEB" stroke="#FDE047" stroke-width="1.5"/>

        <!-- Mũi cún tròn xinh màu nâu chocolate -->
        <ellipse cx="60" cy="53" rx="4" ry="3" fill="#78350F"/>
        <circle cx="58.5" cy="52" r="1" fill="#FFFFFF"/>

        <!-- Miệng cười tít mắt hình chữ W với lưỡi hồng xinh xắn -->
        <path d="M 53 58 Q 56.5 62 60 59 Q 63.5 62 67 58" 
              stroke="#78350F" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M 57 60 Q 60 65 63 60 Z" fill="#FB7185"/>

        <!-- Đôi mắt to tròn long lanh cực kỳ có hồn -->
        <ellipse cx="47" cy="47" rx="5.5" ry="7" fill="#1E293B"/>
        <ellipse cx="73" cy="47" rx="5.5" ry="7" fill="#1E293B"/>
        <!-- Đốm sáng phản chiếu mắt long lanh -->
        <circle cx="45" cy="44.5" r="2.5" fill="#FFFFFF"/>
        <circle cx="48.5" cy="49" r="1.2" fill="#FFFFFF"/>
        <circle cx="71" cy="44.5" r="2.5" fill="#FFFFFF"/>
        <circle cx="74.5" cy="49" r="1.2" fill="#FFFFFF"/>

        <!-- Đôi má hồng đào phúng phính dễ thương -->
        <ellipse cx="37" cy="56" rx="4.5" ry="3" fill="#FB7185" opacity="0.85"/>
        <ellipse cx="83" cy="56" rx="4.5" ry="3" fill="#FB7185" opacity="0.85"/>

        ${isBaby ? `
          <!-- Nửa vỏ trứng vàng rực bọc dưới thân (vẽ ĐÈ LÊN THÂN để rõ ràng) -->
          <path d="M 28 72 Q 24 104 60 106 Q 96 104 92 72 L 84 80 L 76 72 L 68 81 L 60 73 L 52 81 L 44 73 L 36 80 Z" 
                fill="#FEF08A" stroke="#F59E0B" stroke-width="2.5"/>
          <!-- Hai bàn chân nhỏ xinh bám trên miệng vỏ trứng -->
          <ellipse cx="44" cy="74" rx="6" ry="5" fill="#FDE047" stroke="#B45309" stroke-width="1.8"/>
          <ellipse cx="76" cy="74" rx="6" ry="5" fill="#FDE047" stroke="#B45309" stroke-width="1.8"/>
        ` : ''}

        <!-- VÒNG CỔ CHỈ ĐỎ VÀ LỤC LẠC CHUÔNG VÀNG MAY MẮN TO RÕ -->
        <path d="M 43 67 Q 60 75 77 67" stroke="#DC2626" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <circle cx="60" cy="73" r="7.5" fill="url(#ngheBell)" stroke="#B45309" stroke-width="1.8"/>
        <circle cx="58" cy="71" r="2" fill="#FFFFFF" opacity="0.8"/>
        <line x1="55" y1="75" x2="65" y2="75" stroke="#78350F" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="60" cy="77" r="1.2" fill="#78350F"/>
      </svg>
    `;
  },

  // -------------------------------------------------------------------------
  // 6. SVG: BÉ CHIM LẠC ĐÔNG SƠN (TỔ 1 - CHIM TIÊN CHIBI, CÁNH MÂY, MÀO LÔNG VƯƠN CAO)
  // -------------------------------------------------------------------------
  _renderChimLacSVG(level) {
    const isBaby = (level === 3);
    const isMaster = (level === 4);
    const isRoyal = (level >= 5);

    return `
      <svg viewBox="0 0 120 120" class="pet-svg ${isBaby ? 'baby-bounce' : isMaster ? 'magic-hover' : 'royal-glow'}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="lacBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#FDA4AF" />
            <stop offset="60%" stop-color="#F43F5E" />
            <stop offset="100%" stop-color="#E11D48" />
          </linearGradient>
          <linearGradient id="lacWingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#FEF08A" />
            <stop offset="60%" stop-color="#FBBF24" />
            <stop offset="100%" stop-color="#F59E0B" />
          </linearGradient>
          <filter id="lacSoftGlow">
            <feDropShadow dx="0" dy="2" stdDeviation="${isRoyal ? 5 : 3}" flood-color="#F43F5E" flood-opacity="0.45"/>
          </filter>
        </defs>

        ${isRoyal ? `
          <!-- Hào quang mặt trời Đông Sơn 12 cánh rực rỡ -->
          <circle cx="60" cy="60" r="54" stroke="#F43F5E" stroke-width="2.5" stroke-dasharray="7,4" fill="none" opacity="0.85"/>
        ` : ''}

        ${isBaby ? `
          <!-- Hoa giấy confetti -->
          <circle cx="18" cy="22" r="3" fill="#F59E0B"/>
          <circle cx="102" cy="20" r="3" fill="#EF4444"/>
          <circle cx="14" cy="48" r="2.5" fill="#10B981"/>
          <circle cx="106" cy="46" r="2.5" fill="#3B82F6"/>
        ` : ''}

        <!-- 3 Dải lông đuôi Chim Lạc uốn lượn thướt tha mềm mại -->
        <path d="M 64 74 C 84 76 106 68 102 54 C 94 48 84 56 72 68" 
              fill="#FBBF24" stroke="#B45309" stroke-width="1.8"/>
        <path d="M 62 78 C 82 86 104 84 104 68 C 96 62 84 70 70 74" 
              fill="#10B981" stroke="#047857" stroke-width="1.8"/>
        <path d="M 60 82 C 78 96 98 98 98 84 C 90 78 78 84 66 80" 
              fill="#38BDF8" stroke="#0284C7" stroke-width="1.8"/>

        <!-- Đôi cánh tiên dang rộng chào đón đáng yêu -->
        <!-- Cánh trái -->
        <path d="M 38 56 C 18 46 12 32 24 28 C 32 26 38 40 40 54 Z" 
              fill="url(#lacWingGrad)" stroke="#B45309" stroke-width="2"/>
        <path d="M 28 34 C 28 42 34 48 38 50" stroke="#FFFFFF" stroke-width="1.5" fill="none" opacity="0.6"/>
        <!-- Cánh phải -->
        <path d="M 82 56 C 102 46 108 32 96 28 C 88 26 82 40 80 54 Z" 
              fill="url(#lacWingGrad)" stroke="#B45309" stroke-width="2"/>
        <path d="M 92 34 C 92 42 86 48 82 50" stroke="#FFFFFF" stroke-width="1.5" fill="none" opacity="0.6"/>

        <!-- Thân chim Lạc tròn xinh mũm mĩm -->
        <ellipse cx="60" cy="60" rx="25" ry="23" fill="url(#lacBodyGrad)" stroke="#9F1239" stroke-width="2" filter="url(#lacSoftGlow)"/>

        <!-- Bụng chim màu hồng kem sữa mềm mại -->
        <ellipse cx="60" cy="65" rx="16" ry="14" fill="#FFF1F2"/>

        <!-- MÀO LÔNG LẠC VIỆT ĐÔNG SƠN VƯƠN CAO DUYÊN DÁNG (Đặc trưng thuần Việt) -->
        <path d="M 54 39 C 50 16 70 12 76 18 C 80 23 74 34 62 38 Z" 
              fill="url(#lacWingGrad)" stroke="#B45309" stroke-width="2"/>
        <path d="M 50 42 C 44 26 56 22 62 26 C 66 30 60 38 54 41 Z" 
              fill="#F97316" stroke="#B45309" stroke-width="1.5"/>
        <circle cx="70" cy="19" r="2.5" fill="#FEF08A"/>

        ${isRoyal ? `
          <!-- Vương miện hoa sen hoàng gia -->
          <polygon points="46,24 44,10 52,16 60,6 68,16 76,10 74,24" fill="#FBBF24" stroke="#D97706" stroke-width="1.8"/>
          <circle cx="60" cy="6" r="2.8" fill="#EF4444"/>
        ` : ''}

        <!-- Đôi mắt to tròn đen láy long lanh -->
        <ellipse cx="48" cy="52" rx="5.5" ry="7" fill="#1E293B"/>
        <ellipse cx="72" cy="52" rx="5.5" ry="7" fill="#1E293B"/>
        <circle cx="46" cy="49.5" r="2.5" fill="#FFFFFF"/>
        <circle cx="49.5" cy="54" r="1.2" fill="#FFFFFF"/>
        <circle cx="70" cy="49.5" r="2.5" fill="#FFFFFF"/>
        <circle cx="73.5" cy="54" r="1.2" fill="#FFFFFF"/>

        <!-- Chiếc mỏ chim nhỏ xinh màu vàng cam -->
        <path d="M 54 57 Q 60 55 66 57 L 60 67 Z" fill="#FBBF24" stroke="#B45309" stroke-width="1.8"/>
        <line x1="56" y1="59" x2="64" y2="59" stroke="#B45309" stroke-width="1.2"/>

        <!-- Má hồng đào phúng phính -->
        <ellipse cx="38" cy="60" rx="4.5" ry="3" fill="#FDA4AF" opacity="0.9"/>
        <ellipse cx="82" cy="60" rx="4.5" ry="3" fill="#FDA4AF" opacity="0.9"/>

        ${isBaby ? `
          <!-- Nửa vỏ trứng vàng bọc dưới thân -->
          <path d="M 28 74 Q 24 104 60 106 Q 96 104 92 74 L 84 81 L 76 74 L 68 82 L 60 74 L 52 82 L 44 74 L 36 81 Z" 
                fill="#FEF08A" stroke="#F59E0B" stroke-width="2.5"/>
          <circle cx="46" cy="76" r="4" fill="#FDE047" stroke="#B45309" stroke-width="1.5"/>
          <circle cx="74" cy="76" r="4" fill="#FDE047" stroke="#B45309" stroke-width="1.5"/>
        ` : `
          <!-- Đôi chân chim nhỏ xíu màu cam đứng vững vàng -->
          <path d="M 52 83 L 52 94 M 48 94 L 56 94" stroke="#EA580C" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M 68 83 L 68 94 M 64 94 L 72 94" stroke="#EA580C" stroke-width="2.5" stroke-linecap="round"/>
          <ellipse cx="60" cy="100" rx="34" ry="7" fill="#FEF08A" stroke="#F59E0B" stroke-width="1.5"/>
        `}

        <!-- Khánh ngọc bích đeo cổ cổ kính của Lạc Việt -->
        <path d="M 47 70 Q 60 76 73 70" stroke="#FBBF24" stroke-width="2.8" fill="none" stroke-linecap="round"/>
        <circle cx="60" cy="76" r="5" fill="#10B981" stroke="#FBBF24" stroke-width="1.5"/>
      </svg>
    `;
  },

  // -------------------------------------------------------------------------
  // 7. SVG: RÙA VÀNG KIM QUY (TỔ 3 - MAI SEN VÀNG, CÕNG GƯƠM BÁU THẦN THOẠI)
  // -------------------------------------------------------------------------
  _renderKimQuySVG(level) {
    const isBaby = (level === 3);
    const isMaster = (level === 4);
    const isRoyal = (level >= 5);

    return `
      <svg viewBox="0 0 120 120" class="pet-svg ${isBaby ? 'baby-bounce' : isMaster ? 'magic-hover' : 'royal-glow'}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="kimQuyMai" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FEF08A" />
            <stop offset="50%" stop-color="#F59E0B" />
            <stop offset="100%" stop-color="#B45309" />
          </linearGradient>
          <linearGradient id="kimQuySkin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#A7F3D0" />
            <stop offset="100%" stop-color="#10B981" />
          </linearGradient>
          <filter id="quyGlow">
            <feDropShadow dx="0" dy="2" stdDeviation="${isRoyal ? 5 : 3}" flood-color="#10B981" flood-opacity="0.5"/>
          </filter>
        </defs>

        ${isRoyal ? `
          <!-- Hào quang bát bảo ngọc bích -->
          <circle cx="60" cy="60" r="54" stroke="#10B981" stroke-width="2.5" stroke-dasharray="6,4" fill="none"/>
        ` : ''}

        <!-- Làn sóng nước xanh biếc Thăng Long -->
        <path d="M 24 100 Q 42 94 60 100 Q 78 106 96 100" stroke="#38BDF8" stroke-width="3.2" fill="none" stroke-linecap="round"/>

        <!-- 4 Chân bơi mập mạp bơi tung tăng -->
        <ellipse cx="36" cy="74" rx="9" ry="6" fill="url(#kimQuySkin)" stroke="#059669" stroke-width="1.2" transform="rotate(-20 36 74)"/>
        <ellipse cx="84" cy="74" rx="9" ry="6" fill="url(#kimQuySkin)" stroke="#059669" stroke-width="1.2" transform="rotate(20 84 74)"/>
        <ellipse cx="38" cy="92" rx="8" ry="5" fill="url(#kimQuySkin)" stroke="#059669" stroke-width="1.2"/>
        <ellipse cx="82" cy="92" rx="8" ry="5" fill="url(#kimQuySkin)" stroke="#059669" stroke-width="1.2"/>

        ${isBaby ? `
          <!-- Nửa vỏ trứng vàng rực bọc dưới mai -->
          <path d="M 32 82 Q 28 102 60 104 Q 92 102 88 82 L 80 86 L 72 80 L 64 87 L 56 81 L 48 87 L 40 81 Z" 
                fill="#FEF08A" stroke="#F59E0B" stroke-width="2"/>
        ` : ''}

        <!-- Mai Rùa Vàng Kim Quy khắc hoa văn triện âm dương cổ kính -->
        <ellipse cx="60" cy="68" rx="31" ry="26" fill="url(#kimQuyMai)" stroke="#92400E" stroke-width="2" filter="url(#quyGlow)"/>
        <polygon points="60,50 73,59 73,75 60,84 47,75 47,59" stroke="#FEF08A" stroke-width="2" fill="#F59E0B" fill-opacity="0.35"/>
        <line x1="60" y1="50" x2="60" y2="44" stroke="#FEF08A" stroke-width="1.8"/>
        <line x1="73" y1="59" x2="80" y2="55" stroke="#FEF08A" stroke-width="1.8"/>
        <line x1="73" y1="75" x2="82" y2="80" stroke="#FEF08A" stroke-width="1.8"/>
        <line x1="47" y1="59" x2="40" y2="55" stroke="#FEF08A" stroke-width="1.8"/>
        <line x1="47" y1="75" x2="38" y2="80" stroke="#FEF08A" stroke-width="1.8"/>

        <!-- CÕNG THANH GƯƠM BÁU THUẬN THIÊN (HỒ GƯƠM) TRÊN LƯNG -->
        <g transform="translate(0, -6)">
          <path d="M 58 22 L 62 22 L 61 44 L 59 44 Z" fill="#A7F3D0" stroke="#059669" stroke-width="1.2"/>
          <rect x="54" y="32" width="12" height="3.5" rx="1.5" fill="#FBBF24" stroke="#D97706" stroke-width="1"/>
          <circle cx="60" cy="22" r="2.5" fill="#FBBF24"/>
        </g>

        <!-- Đầu rùa Kim Quy tròn xoe màu xanh ngọc bích -->
        <ellipse cx="60" cy="48" rx="17" ry="15" fill="url(#kimQuySkin)" stroke="#059669" stroke-width="1.5"/>

        ${isRoyal ? `
          <!-- Mũ Trạng Nguyên sen vàng hoàng gia -->
          <rect x="50" y="24" width="20" height="7" rx="2" fill="#F59E0B" stroke="#B45309" stroke-width="1.2"/>
          <circle cx="60" cy="24" r="3" fill="#DC2626"/>
        ` : ''}

        <!-- Đôi mắt to tròn hiền từ thông thái -->
        <ellipse cx="53" cy="46" rx="5.5" ry="7" fill="#1E293B"/>
        <ellipse cx="67" cy="46" rx="5.5" ry="7" fill="#1E293B"/>
        <circle cx="55" cy="43.5" r="2.5" fill="#FFFFFF"/>
        <circle cx="69" cy="43.5" r="2.5" fill="#FFFFFF"/>

        <!-- Nụ cười hiền hậu ấm áp -->
        <path d="M 56 55 Q 60 59 64 55" stroke="#065F46" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <!-- Má hồng -->
        <ellipse cx="46" cy="53" rx="3.5" ry="2.2" fill="#FB7185" opacity="0.8"/>
        <ellipse cx="74" cy="53" rx="3.5" ry="2.2" fill="#FB7185" opacity="0.8"/>
      </svg>
    `;
  },

  // -------------------------------------------------------------------------
  // 8. SVG: BÉ RỒNG VÀNG THĂNG LONG (TỔ 4 - RỒNG CHIBI THỜI LÝ, NGẬM/ÔM NGỌC MINH CHÂU)
  // -------------------------------------------------------------------------
  _renderRongVangSVG(level) {
    const isBaby = (level === 3);
    const isMaster = (level === 4);
    const isRoyal = (level >= 5);

    return `
      <svg viewBox="0 0 120 120" class="pet-svg ${isBaby ? 'baby-bounce' : isMaster ? 'magic-hover' : 'royal-glow'}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="rongBody" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#FEF08A" />
            <stop offset="50%" stop-color="#FBBF24" />
            <stop offset="100%" stop-color="#F59E0B" />
          </linearGradient>
          <linearGradient id="rongMane" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#F87171" />
            <stop offset="100%" stop-color="#DC2626" />
          </linearGradient>
          <linearGradient id="minhChauGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFFFFF" />
            <stop offset="40%" stop-color="#67E8F9" />
            <stop offset="100%" stop-color="#0284C7" />
          </linearGradient>
          <filter id="rongSoftGlow">
            <feDropShadow dx="0" dy="2" stdDeviation="${isRoyal ? 6 : 4}" flood-color="#F59E0B" flood-opacity="0.5"/>
          </filter>
        </defs>

        ${isRoyal ? `
          <!-- Vầng hào quang Thần Long ngũ sắc -->
          <circle cx="60" cy="60" r="54" stroke="#F59E0B" stroke-width="2.5" stroke-dasharray="6,4" fill="none" opacity="0.85"/>
        ` : ''}

        ${isBaby ? `
          <!-- Hoa giấy confetti chúc mừng -->
          <circle cx="18" cy="22" r="3" fill="#EF4444"/>
          <circle cx="102" cy="20" r="3" fill="#F59E0B"/>
          <circle cx="14" cy="48" r="2.5" fill="#10B981"/>
          <circle cx="106" cy="46" r="2.5" fill="#3B82F6"/>
        ` : ''}

        <!-- Đuôi rồng uốn lượn chữ S mềm mại có chóp mây lửa -->
        <path d="M 76 80 C 96 82 108 68 98 56 C 90 48 84 56 86 66 C 88 72 82 76 76 80" 
              fill="url(#rongBody)" stroke="#B45309" stroke-width="2"/>
        <path d="M 98 56 C 106 48 110 56 104 62 Z" fill="url(#rongMane)"/>

        ${!isBaby ? `
          <!-- Thân rồng ngồi mũm mĩm -->
          <ellipse cx="60" cy="80" rx="22" ry="18" fill="url(#rongBody)" stroke="#B45309" stroke-width="2"/>
          <!-- Vảy bụng rồng vàng óng -->
          <ellipse cx="60" cy="82" rx="13" ry="12" fill="#FEF9C3"/>
          <path d="M 52 78 Q 60 82 68 78" stroke="#F59E0B" stroke-width="1.5" fill="none"/>
          <path d="M 53 84 Q 60 88 67 84" stroke="#F59E0B" stroke-width="1.5" fill="none"/>
          <!-- Chân rồng móng tròn xinh -->
          <ellipse cx="44" cy="94" rx="7" ry="5.5" fill="#FDE047" stroke="#B45309" stroke-width="1.5"/>
          <ellipse cx="76" cy="94" rx="7" ry="5.5" fill="#FDE047" stroke="#B45309" stroke-width="1.5"/>
        ` : ''}

        <!-- ĐÔI SỪNG RỒNG THỜI LÝ NHỎ XINH MÀU VÀNG KIM -->
        <path d="M 44 32 C 38 18 46 14 50 20 C 52 24 48 30 46 34 Z" 
              fill="#FDE047" stroke="#B45309" stroke-width="1.8"/>
        <path d="M 76 32 C 82 18 74 14 70 20 C 68 24 72 30 74 34 Z" 
              fill="#FDE047" stroke="#B45309" stroke-width="1.8"/>

        <!-- BỜM MÂY LỬA ĐỎ THẮM TRÊN ĐỈNH ĐẦU -->
        <path d="M 48 26 C 52 14 60 10 64 16 C 68 12 72 16 70 26 Z" 
              fill="url(#rongMane)" stroke="#991B1B" stroke-width="1.5"/>

        <!-- Đầu Rồng Con Chibi tròn xoe uy nghi mà hiền lành -->
        <ellipse cx="60" cy="50" rx="26" ry="22" fill="url(#rongBody)" stroke="#B45309" stroke-width="2" filter="url(#rongSoftGlow)"/>

        ${isRoyal ? `
          <!-- Vương miện hoa sen hoàng gia Thăng Long -->
          <polygon points="46,24 44,8 52,14 60,4 68,14 76,8 74,24" fill="#FBBF24" stroke="#D97706" stroke-width="1.8"/>
          <circle cx="60" cy="4" r="3" fill="#0284C7"/>
        ` : ''}

        <!-- Mõm rồng tròn màu vàng nhạt -->
        <ellipse cx="60" cy="56" rx="16" ry="11" fill="#FEF9C3" stroke="#FDE047" stroke-width="1.5"/>

        <!-- ĐÔI RÂU RỒNG UỐN LƯỢN CHỮ S ĐẶC TRƯNG THỜI LÝ -->
        <path d="M 45 54 C 30 50 24 64 34 66" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <path d="M 75 54 C 90 50 96 64 86 66" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round" fill="none"/>

        <!-- Hai lỗ mũi rồng nhỏ xinh -->
        <circle cx="56" cy="53" r="1.5" fill="#78350F"/>
        <circle cx="64" cy="53" r="1.5" fill="#78350F"/>

        <!-- Miệng cười tươi hiền từ -->
        <path d="M 53 58 Q 60 63 67 58" stroke="#78350F" stroke-width="2" fill="none" stroke-linecap="round"/>

        <!-- Đôi mắt to tròn long lanh thông minh -->
        <ellipse cx="47" cy="45" rx="5.5" ry="7" fill="#1E293B"/>
        <ellipse cx="73" cy="45" rx="5.5" ry="7" fill="#1E293B"/>
        <!-- Ánh sáng phản chiếu mắt long lanh -->
        <circle cx="45" cy="42.5" r="2.5" fill="#FFFFFF"/>
        <circle cx="48.5" cy="47" r="1.2" fill="#FFFFFF"/>
        <circle cx="71" cy="42.5" r="2.5" fill="#FFFFFF"/>
        <circle cx="74.5" cy="47" r="1.2" fill="#FFFFFF"/>

        <!-- Đôi má hồng đào rạng rỡ -->
        <ellipse cx="37" cy="54" rx="4.5" ry="3" fill="#FB7185" opacity="0.85"/>
        <ellipse cx="83" cy="54" rx="4.5" ry="3" fill="#FB7185" opacity="0.85"/>

        ${isBaby ? `
          <!-- Nửa vỏ trứng vàng rực bọc dưới thân -->
          <path d="M 28 72 Q 24 104 60 106 Q 96 104 92 72 L 84 80 L 76 72 L 68 81 L 60 73 L 52 81 L 44 73 L 36 80 Z" 
                fill="#FEF08A" stroke="#F59E0B" stroke-width="2.5"/>
        ` : ''}

        <!-- VIÊN NGỌC MINH CHÂU TO SÁNG RỰC RỠ TRƯỚC NGỰC -->
        <circle cx="60" cy="72" r="9" fill="url(#minhChauGlow)" stroke="#0284C7" stroke-width="1.8"/>
        <circle cx="57" cy="69" r="3" fill="#FFFFFF" opacity="0.85"/>
        <circle cx="63" cy="75" r="1.2" fill="#FFFFFF" opacity="0.85"/>

        <!-- Hai tay rồng con ôm viên ngọc báu -->
        <ellipse cx="48" cy="72" rx="4.5" ry="4" fill="#FDE047" stroke="#B45309" stroke-width="1.5"/>
        <ellipse cx="72" cy="72" rx="4.5" ry="4" fill="#FDE047" stroke="#B45309" stroke-width="1.5"/>
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
