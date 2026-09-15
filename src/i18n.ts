import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const LANGUAGE_STORAGE_KEY = "fruit-slashing-language";
type SupportedLanguage = "vi" | "en";
const isSupportedLanguage = (value: string | null): value is SupportedLanguage => value === "vi" || value === "en";
const DEFAULT_LANGUAGE: SupportedLanguage = "en";
const getInitialLanguage = (): SupportedLanguage => { if (typeof window === "undefined") return DEFAULT_LANGUAGE; try { const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY); return isSupportedLanguage(value) ? value : DEFAULT_LANGUAGE; } catch { return DEFAULT_LANGUAGE; } };
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
      },
      tutorial: {
        step1: "Kéo ngang bao phủ 3 ô cho số 3 (mỗi số là số ô của hình).",
        step1Success: "Chính xác! Hình chữ nhật phải chứa đúng số ô bằng số gợi ý.",
        step2: "Bây giờ kéo dọc bao phủ 2 ô cho số 2.",
        step2Success: "Rất tốt! Mỗi hình chỉ được chứa duy nhất một số.",
        step3: "Kéo bao phủ 4 ô cuối cùng để kín bàn cờ!",
        level2Tip: "Nhớ rằng: các hình không được chồng lên nhau và phải phủ kín bàn cờ.",
        complete: "Tuyệt vời! Bạn đã nắm vững cách chơi Shikaku.",
      },
      feedback: {
        wrongArea: "Hình này có {{count}} ô, nhưng số gợi ý là {{clue}}.",
        multipleClues: "Hình chữ nhật chỉ được chứa duy nhất một số.",
        noClue: "Hình chữ nhật phải chứa một số gợi ý.",
        overlap: "Vùng này bị đè lên một hình đã có.",
        outOfBounds: "Vùng chọn vượt ra ngoài bàn cờ.",
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
      },
      tutorial: {
        step1: "Drag across to cover 3 cells for number 3 (each number is its cell area).",
        step1Success: "Great! The rectangle must contain exactly this many cells.",
        step2: "Now drag down to cover 2 cells for number 2.",
        step2Success: "Well done! Each rectangle can only contain one number.",
        step3: "Drag to cover the last 4 cells and fill the board!",
        level2Tip: "Remember: rectangles cannot overlap and must cover the entire board.",
        complete: "Awesome! You have mastered the rules of Shikaku.",
      },
      feedback: {
        wrongArea: "This rectangle has {{count}} cells, but the clue is {{clue}}.",
        multipleClues: "A rectangle can contain only one number.",
        noClue: "A rectangle must contain one number.",
        overlap: "This area overlaps another rectangle.",
        outOfBounds: "Selection is out of bounds.",
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
i18n.on("languageChanged", persistLanguage);

export default i18n;
