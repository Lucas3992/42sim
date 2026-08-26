import { ref } from 'vue';

const theme = ref<'light' | 'dark'>(
  matchMedia('(prefers-color-scheme:dark)').matches ? 'light' : 'dark'
);

document.documentElement.setAttribute('data-theme', theme.value);

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', theme.value);
}

export function useTheme() {
  return { theme, toggleTheme };
}