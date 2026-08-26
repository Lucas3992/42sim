import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './assets/style.css';
import { i18n } from './lang/i18n.ts';

const app = createApp(App);
app.use(router);
app.use(i18n);
app.mount('#app');