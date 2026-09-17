import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const LANGUAGE_STORAGE_KEY = "09-shikaku-language";
type SupportedLanguage = "vi" | "en";
const isSupportedLanguage = (value: string | null): value is SupportedLanguage => value === "vi" || value === "en";
const DEFAULT_LANGUAGE: SupportedLanguage = "en";
const getInitialLanguage = (): SupportedLanguage => {
  if (typeof window === 'undefined') return 'en';
  try {
    const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isSupportedLanguage(value)) return value;
  } catch {
    // Storage read failure fallback
  }
  
  return 'en';
};
const syncDocumentLang = (lang: string) => {
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.lang = lang;
  }
};
const persistLanguage = (language: string): void => { const normalized = language.split("-")[0]; if (typeof window === "undefined" || !isSupportedLanguage(normalized)) return; try { window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized); } catch { /* Optional persistence. */ } };

const resources = {
  vi: {
    translation: {
      common: {
        play: "Chơi",
        pause: "Tạm dừng",
        resume: "Tiếp tục",
        back: "Quay lại",
        close: "Đóng",
        retry: "Chơi lại",
        next: "Tiếp tục →",
        playGame: "Chơi ngay →",
        leaderboard: "Bảng xếp hạng",
        you: "Bạn",
        loading: "Đang tải...",
        noScores: "Chưa có điểm số nào",
        anonymous: "Người chơi",
      },
      settings: {
        title: "Cài đặt",
        language: "Ngôn ngữ",
        music: "Nhạc nền",
        sfx: "Hiệu ứng âm thanh",
        on: "Bật",
        off: "Tắt",
      },
      game: {
        rectangles: "Khối",
        hint: "Gợi ý",
        undo: "Hoàn tác",
        skipTutorial: "Bỏ qua hướng dẫn",
        howToPlay: "Cách chơi",
        tutorialTitle: "Hướng dẫn",
        levelTitle: "Màn",
      },
      completeModal: {
        title: "Hoàn thành màn chơi",
        solved: "Màn {{levelId}} đã giải xong",
      },
      tutorial: {
        step1: "Kéo bao phủ 3 ô cho số 3 để tạo khối.",
        step2: "Chạm 1 lần nữa vào khối vừa tạo để hủy khối.",
        step3: "Rất tốt! Giờ hãy kéo tạo lại khối 3 ô cho số 3.",
        step4: "Bây giờ kéo dọc bao phủ 2 ô cho số 2.",
        step5: "Kéo bao phủ 4 ô cuối cùng để phủ kín bàn cờ!",
        tapPrompt: "👆 Chạm để hủy",
        level2Tip: "Nhớ rằng: các hình không được chồng lên nhau và phải phủ kín bàn cờ.",
        complete: "Tuyệt vời! Bạn đã nắm vững cách chơi Shikaku.",
      },
      feedback: {
        wrongArea: "Hình này có {{count}} ô, nhưng số gợi ý là {{clue}}.",
        multipleClues: "Hình chữ nhật chỉ được chứa duy nhất một số.",
        noClue: "Hình chữ nhật phải chứa một số gợi ý.",
        overlap: "Vùng này bị đè lên một hình đã có.",
        outOfBounds: "Vùng chọn vượt ra ngoài bàn cờ.",
        boardFullIncorrect: "Bảng đã phủ kín nhưng các khối chưa đúng nghiệm. Hãy chạm vào khối để gỡ hoặc vẽ lại nhé!",
      },
      rulesModal: {
        title: "Luật chơi Shikaku",
        rule1Title: "1. Diện tích hình chữ nhật",
        rule1Desc: "Mỗi số thể hiện số ô mà hình chữ nhật đó phải bao phủ.",
        rule2Title: "2. Một số duy nhất",
        rule2Desc: "Mỗi hình chữ nhật chỉ được chứa đúng một số gợi ý.",
        rule3Title: "3. Không chồng lấn",
        rule3Desc: "Các hình chữ nhật không được đè lên nhau.",
        rule4Title: "4. Phủ kín bàn cờ",
        rule4Desc: "Khi giải xong, không được để trống bất kỳ ô nào.",
        replayTutorial: "Chơi lại hướng dẫn",
        gotIt: "Đã hiểu",
      },
    },
  },
  en: {
    translation: {
      common: {
        play: "Play",
        pause: "Pause",
        resume: "Resume",
        back: "Back",
        close: "Close",
        retry: "Play again",
        next: "Next →",
        playGame: "Play Game →",
        leaderboard: "Leaderboard",
        you: "You",
        loading: "Loading...",
        noScores: "No scores yet",
        anonymous: "Player",
      },
      settings: {
        title: "Settings",
        language: "Language",
        music: "Background music",
        sfx: "Sound effects",
        on: "On",
        off: "Off",
      },
      game: {
        rectangles: "Rectangles",
        hint: "Hint",
        undo: "Undo",
        skipTutorial: "Skip Tutorial",
        howToPlay: "How to Play",
        tutorialTitle: "Tutorial",
        levelTitle: "Level",
      },
      completeModal: {
        title: "Puzzle Complete",
        solved: "Level {{levelId}} solved",
      },
      tutorial: {
        step1: "Drag across to cover 3 cells for number 3 to create a block.",
        step2: "Tap the block once more to cancel/remove it.",
        step3: "Well done! Now drag again to recreate the 3-cell block.",
        step4: "Now drag down to cover 2 cells for number 2.",
        step5: "Drag to cover the last 4 cells and fill the board!",
        tapPrompt: "👆 Tap to remove",
        level2Tip: "Remember: rectangles cannot overlap and must cover the entire board.",
        complete: "Awesome! You have mastered the rules of Shikaku.",
      },
      feedback: {
        wrongArea: "This rectangle has {{count}} cells, but the clue is {{clue}}.",
        multipleClues: "A rectangle can contain only one number.",
        noClue: "A rectangle must contain one number.",
        overlap: "This area overlaps another rectangle.",
        outOfBounds: "Selection is out of bounds.",
        boardFullIncorrect: "The board is full, but the rectangles do not match the clues yet. Tap a block to remove or redraw!",
      },
      rulesModal: {
        title: "How to Play Shikaku",
        rule1Title: "1. Area of rectangle",
        rule1Desc: "Every number is the exact area (cells) of that rectangle.",
        rule2Title: "2. Single clue per box",
        rule2Desc: "Each rectangle must contain exactly one number.",
        rule3Title: "3. No overlaps",
        rule3Desc: "Rectangles cannot overlap one another.",
        rule4Title: "4. Cover the whole board",
        rule4Desc: "When solved, every single grid cell must be covered.",
        replayTutorial: "Replay Tutorial",
        gotIt: "Got it",
      },
    },
  },
} as const;

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    supportedLngs: ["vi", "en"],
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: { escapeValue: false },
  });
syncDocumentLang(i18n.language || DEFAULT_LANGUAGE);
i18n.on("languageChanged", (lng) => {
  persistLanguage(lng);
  syncDocumentLang(lng);
});

export default i18n;
