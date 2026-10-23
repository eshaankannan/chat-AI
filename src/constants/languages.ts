export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  speechCode: string;
  region?: string;
}

export const WORLD_LANGUAGES: LanguageOption[] = [
  // Global Universal Auto-Detect
  { code: 'auto', name: 'Auto-Detect (Every Language in the World)', nativeName: 'Universal Polyglot AI', speechCode: 'en-US', region: 'Global' },

  // Most Spoken & Major World Languages
  { code: 'en', name: 'English', nativeName: 'English', speechCode: 'en-US', region: 'Global' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', speechCode: 'es-ES', region: 'Europe / Americas' },
  { code: 'zh', name: 'Chinese (Mandarin)', nativeName: '中文 (普通话)', speechCode: 'zh-CN', region: 'Asia' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', speechCode: 'hi-IN', region: 'South Asia' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', speechCode: 'ar-SA', region: 'Middle East & North Africa' },
  { code: 'fr', name: 'French', nativeName: 'Français', speechCode: 'fr-FR', region: 'Europe / Africa' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', speechCode: 'pt-BR', region: 'Americas / Europe' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', speechCode: 'bn-IN', region: 'South Asia' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', speechCode: 'ru-RU', region: 'Europe / Asia' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', speechCode: 'ja-JP', region: 'East Asia' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', speechCode: 'de-DE', region: 'Europe' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', speechCode: 'ko-KR', region: 'East Asia' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', speechCode: 'tr-TR', region: 'Middle East / Europe' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', speechCode: 'it-IT', region: 'Europe' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', speechCode: 'vi-VN', region: 'Southeast Asia' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', speechCode: 'id-ID', region: 'Southeast Asia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', speechCode: 'ms-MY', region: 'Southeast Asia' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', speechCode: 'th-TH', region: 'Southeast Asia' },

  // South Asian & Regional Indian Languages
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', speechCode: 'ta-IN', region: 'South Asia' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', speechCode: 'te-IN', region: 'South Asia' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', speechCode: 'ml-IN', region: 'South Asia' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', speechCode: 'kn-IN', region: 'South Asia' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', speechCode: 'mr-IN', region: 'South Asia' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', speechCode: 'gu-IN', region: 'South Asia' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', speechCode: 'pa-IN', region: 'South Asia' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', speechCode: 'ur-PK', region: 'South Asia' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', speechCode: 'or-IN', region: 'South Asia' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', speechCode: 'as-IN', region: 'South Asia' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', speechCode: 'hi-IN', region: 'South Asia' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', speechCode: 'ne-NP', region: 'South Asia' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', speechCode: 'si-LK', region: 'South Asia' },
  { code: 'ps', name: 'Pashto', nativeName: 'پښتو', speechCode: 'ps-AF', region: 'Central / South Asia' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي', speechCode: 'sd-PK', region: 'South Asia' },

  // Middle Eastern & Central Asian Languages
  { code: 'fa', name: 'Persian (Farsi)', nativeName: 'فارسی', speechCode: 'fa-IR', region: 'Middle East' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', speechCode: 'he-IL', region: 'Middle East' },
  { code: 'ku', name: 'Kurdish', nativeName: 'Kurdî / کوردی', speechCode: 'ku-TR', region: 'Middle East' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan', speechCode: 'az-AZ', region: 'Caucasus' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული', speechCode: 'ka-GE', region: 'Caucasus' },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն', speechCode: 'hy-AM', region: 'Caucasus' },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақша', speechCode: 'kk-KZ', region: 'Central Asia' },
  { code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbekcha', speechCode: 'uz-UZ', region: 'Central Asia' },
  { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча', speechCode: 'ky-KG', region: 'Central Asia' },
  { code: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ', speechCode: 'tg-TJ', region: 'Central Asia' },
  { code: 'tk', name: 'Turkmen', nativeName: 'Türkmençe', speechCode: 'tk-TM', region: 'Central Asia' },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол', speechCode: 'mn-MN', region: 'East Asia' },

  // African Languages
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', speechCode: 'sw-KE', region: 'East Africa' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', speechCode: 'am-ET', region: 'East Africa' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Èdè Yorùbá', speechCode: 'yo-NG', region: 'West Africa' },
  { code: 'ig', name: 'Igbo', nativeName: 'Asụsụ Igbo', speechCode: 'ig-NG', region: 'West Africa' },
  { code: 'ha', name: 'Hausa', nativeName: 'Harshen Hausa', speechCode: 'ha-NG', region: 'West Africa' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', speechCode: 'zu-ZA', region: 'Southern Africa' },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa', speechCode: 'xh-ZA', region: 'Southern Africa' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', speechCode: 'af-ZA', region: 'Southern Africa' },
  { code: 'so', name: 'Somali', nativeName: 'Af-Soomaali', speechCode: 'so-SO', region: 'Horn of Africa' },
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda', speechCode: 'rw-RW', region: 'East Africa' },
  { code: 'om', name: 'Oromo', nativeName: 'Afaan Oromoo', speechCode: 'om-ET', region: 'East Africa' },
  { code: 'ti', name: 'Tigrinya', nativeName: 'ትግርኛ', speechCode: 'ti-ET', region: 'Horn of Africa' },
  { code: 'mg', name: 'Malagasy', nativeName: 'Fiteny Malagasy', speechCode: 'mg-MG', region: 'Africa' },
  { code: 'sn', name: 'Shona', nativeName: 'chiShona', speechCode: 'sn-ZW', region: 'Southern Africa' },

  // European Languages
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', speechCode: 'nl-NL', region: 'Europe' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', speechCode: 'pl-PL', region: 'Europe' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', speechCode: 'sv-SE', region: 'Northern Europe' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', speechCode: 'no-NO', region: 'Northern Europe' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', speechCode: 'da-DK', region: 'Northern Europe' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', speechCode: 'fi-FI', region: 'Northern Europe' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', speechCode: 'el-GR', region: 'Southern Europe' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', speechCode: 'cs-CZ', region: 'Central Europe' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', speechCode: 'hu-HU', region: 'Central Europe' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', speechCode: 'ro-RO', region: 'Eastern Europe' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', speechCode: 'uk-UA', region: 'Eastern Europe' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', speechCode: 'bg-BG', region: 'Eastern Europe' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски / Srpski', speechCode: 'sr-RS', region: 'Balkans' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', speechCode: 'hr-HR', region: 'Balkans' },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski', speechCode: 'bs-BA', region: 'Balkans' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', speechCode: 'sk-SK', region: 'Central Europe' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', speechCode: 'sl-SI', region: 'Central Europe' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', speechCode: 'lt-LT', region: 'Baltic' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', speechCode: 'lv-LV', region: 'Baltic' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', speechCode: 'et-EE', region: 'Baltic' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska', speechCode: 'is-IS', region: 'Northern Europe' },
  { code: 'ga', name: 'Irish (Gaeilge)', nativeName: 'Gaeilge', speechCode: 'ga-IE', region: 'British Isles' },
  { code: 'cy', name: 'Welsh (Cymraeg)', nativeName: 'Cymraeg', speechCode: 'cy-GB', region: 'British Isles' },
  { code: 'gd', name: 'Scottish Gaelic', nativeName: 'Gàidhlig', speechCode: 'gd-GB', region: 'British Isles' },
  { code: 'eu', name: 'Basque', nativeName: 'Euskara', speechCode: 'eu-ES', region: 'Southern Europe' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català', speechCode: 'ca-ES', region: 'Southern Europe' },
  { code: 'gl', name: 'Galician', nativeName: 'Galego', speechCode: 'gl-ES', region: 'Southern Europe' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip', speechCode: 'sq-AL', region: 'Balkans' },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски', speechCode: 'mk-MK', region: 'Balkans' },
  { code: 'mt', name: 'Maltese', nativeName: 'Malti', speechCode: 'mt-MT', region: 'Mediterranean' },

  // Southeast & East Asian Languages
  { code: 'tl', name: 'Filipino (Tagalog)', nativeName: 'Tagalog', speechCode: 'fil-PH', region: 'Southeast Asia' },
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာစာ', speechCode: 'my-MM', region: 'Southeast Asia' },
  { code: 'km', name: 'Khmer', nativeName: 'ភាសាខ្មែរ', speechCode: 'km-KH', region: 'Southeast Asia' },
  { code: 'lo', name: 'Lao', nativeName: 'ພາສາລາວ', speechCode: 'lo-LA', region: 'Southeast Asia' },
  { code: 'bo', name: 'Tibetan', nativeName: 'བོད་སྐད', speechCode: 'bo-CN', region: 'East Asia' },

  // Pacific & Oceanic Languages
  { code: 'mi', name: 'Māori', nativeName: 'Te Reo Māori', speechCode: 'mi-NZ', region: 'Oceania' },
  { code: 'sm', name: 'Samoan', nativeName: 'Gagana Sāmoa', speechCode: 'sm-WS', region: 'Oceania' },
  { code: 'to', name: 'Tongan', nativeName: 'Lea Faka-Tonga', speechCode: 'to-TO', region: 'Oceania' },
  { code: 'haw', name: 'Hawaiian', nativeName: 'ʻŌlelo Hawaiʻi', speechCode: 'haw-US', region: 'Oceania' },
  { code: 'fj', name: 'Fijian', nativeName: 'Na Vosa Vakaviti', speechCode: 'fj-FJ', region: 'Oceania' },

  // Classical & Auxiliary Languages
  { code: 'la', name: 'Latin', nativeName: 'Latina', speechCode: 'it-IT', region: 'Classical' },
  { code: 'eo', name: 'Esperanto', nativeName: 'Esperanto', speechCode: 'eo-001', region: 'International Auxiliary' },
  { code: 'yi', name: 'Yiddish', nativeName: 'ייִדיש', speechCode: 'yi-001', region: 'Jewish Diaspora' },
];

export function getLanguageByCode(code: string): LanguageOption {
  return WORLD_LANGUAGES.find((l) => l.code === code) || WORLD_LANGUAGES[0];
}
