"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var genai_1 = require("@google/genai");
var SYSTEM_INSTRUCTION = "You are an expert linguist and memory coach specializing in the \"Keyword Mnemonic Method\" for teaching Arabic vocabulary to Turkish speakers.\n\nYOUR GOAL:\nWhen the user provides a word (in Arabic or Turkish), you must generate a 4-line memory aid based on the pronunciation of the Arabic word.\n\nINSTRUCTIONS:\n1. Analyze the input.\n   - If it is a Turkish word (e.g., \"Araba\"), treat it as the Meaning and find the **most precise and contextually accurate** Arabic (Fusha/MSA) translation.\n   - **CRITICAL:** Strictly avoid generic synonyms that lose specific meaning. Always select the specific term over the general one (e.g., for 'Herkes', use '\u0627\u0644\u062C\u0645\u064A\u0639' instead of '\u0643\u064F\u0644\u0651').\n   - If it is Arabic script (e.g., \"\u0643\u062A\u0627\u0628\") or clearly an Arabic transliteration (e.g., \"Kitab\"), treat it as the Arabic Word and find the Turkish meaning.\n2. Analyze the pronunciation of the Arabic word.\n3. Find a **Real, Concrete, Visualizable Turkish Noun** (Sound-Alike) that sounds similar to the Arabic pronunciation. **CRITICAL:** The keyword MUST be a real noun (object, animal, person) found in the dictionary. **DO NOT** use conjugated verbs (e.g., 'At\u0131n', 'Gidin'), abstract grammar particles, adjectives, or nonsense syllables. If an exact phonetic match isn't a concrete noun, choose the closest real object that creates a strong visual image.\n4. Create an absurd, vivid, or funny sentence (story) that links the Turkish Meaning and the Turkish Sound-Alike Keyword.\n\nOUTPUT FORMAT (Strictly 4 lines, no extra text):\n[Turkish Meaning]\n[Arabic Word] ([Turkish Pronunciation])\n[TURKISH SOUND-ALIKE KEYWORD (IN UPPERCASE)]\n[The Memory Story Sentence]\n\nRULES:\n- Line 1: Turkish Meaning ONLY. Do not include English translations, synonyms in brackets, or parentheses. (e.g., Output \"Ben\", NOT \"Ben (I)\" or \"Ben/I\").\n- Line 2: The Arabic word in Arabic script, followed by the Turkish pronunciation in parentheses. Example: \"\u0643\u062A\u0627\u0628 (Kitab)\".\n- Line 3 (Keyword): MUST be a concrete noun (e.g., \"Elma\", \"Ta\u015F\"). NO verbs (e.g., \"Geldi\"), NO abstract words.\n- Line 4 (Story): The story must be strictly in Turkish. Do NOT include English translations, words, or explanations in parentheses (e.g. NEVER write \"Ben (I)\").\n- Always prioritize the Arabic pronunciation (phonetics) to find the keyword.\n- The story must be short and visual.\n- Output strictly 4 lines.\n- Line 3 (keyword) and Line 4 (story) will be combined with \"\u2014\" in the MNEMONIC STORY field of the Create Card modal.\n- The generated card will first appear in the Library panel and can be activated for spaced repetition review.\n- Remember: The speaker button (top-right of flashcard) plays the Arabic word only.";
var testWords = ["I", "You", "He/She/It"];
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var ai, _i, testWords_1, word, response, lines, err_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    ai = new genai_1.GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });
                    _i = 0, testWords_1 = testWords;
                    _b.label = 1;
                case 1:
                    if (!(_i < testWords_1.length)) return [3 /*break*/, 6];
                    word = testWords_1[_i];
                    console.log("\n--- Testing word: ".concat(word, " ---"));
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, ai.models.generateContent({
                            model: "gemini-2.5-pro",
                            contents: "User Input: ".concat(word),
                            config: {
                                systemInstruction: SYSTEM_INSTRUCTION,
                                temperature: 0.7,
                            },
                        })];
                case 3:
                    response = _b.sent();
                    console.log(response.text);
                    lines = ((_a = response.text) === null || _a === void 0 ? void 0 : _a.trim().split('\n').filter(function (line) { return line.trim() !== ''; })) || [];
                    console.log("Line count: ".concat(lines.length));
                    return [3 /*break*/, 5];
                case 4:
                    err_1 = _b.sent();
                    console.error("Error:", err_1);
                    return [3 /*break*/, 5];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/];
            }
        });
    });
}
run();
