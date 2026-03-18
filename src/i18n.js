import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en  from './locales/en.json'
import ta  from './locales/ta.json'
import hi  from './locales/hi.json'
import bn  from './locales/bn.json'
import my  from './locales/my.json'
import si  from './locales/si.json'
import fil from './locales/fil.json'
import id  from './locales/id.json'
import zh  from './locales/zh.json'
import th  from './locales/th.json'
import ur  from './locales/ur.json'
import ne  from './locales/ne.json'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en:  { translation: en  },
      ta:  { translation: ta  },
      hi:  { translation: hi  },
      bn:  { translation: bn  },
      my:  { translation: my  },
      si:  { translation: si  },
      fil: { translation: fil },
      id:  { translation: id  },
      zh:  { translation: zh  },
      th:  { translation: th  },
      ur:  { translation: ur  },
      ne:  { translation: ne  },
    },
    lng: localStorage.getItem('remlo_lang') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
