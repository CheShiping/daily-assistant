import { createApp } from 'vue'
import { Quasar, Notify, Dialog, LoadingBar, Dark } from 'quasar'

// Quasar icon set + 基础样式
import '@quasar/extras/material-icons/material-icons.css'
import '@quasar/extras/material-symbols-rounded/material-symbols-rounded.css'
import 'quasar/src/css/index.sass'

import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)

app.use(Quasar, {
  plugins: { Notify, Dialog, LoadingBar, Dark },
  config: {
    dark: false,
    brand: {
      primary: '#F5A04D',
      secondary: '#7AAA9B',
      accent: '#DD8233',
      dark: '#2C2A26',
      'dark-page': '#FCFBF7',
      positive: '#6B9B7E',
      negative: '#D67849',
      info: '#6B9DAD',
      warning: '#D89A4E'
    },
    notify: {
      position: 'top',
      timeout: 2400
    }
  }
})

app.use(router)
app.mount('#app')
