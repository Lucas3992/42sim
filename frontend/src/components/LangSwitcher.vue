<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useLanguage } from './useLang.ts';

const { currentLanguage, setLanguage } = useLanguage();

const isOpen = ref(false);
const switcherRef = ref<HTMLElement | null>(null);

const langMeta = {
  EN: {
    label: 'English',
    code: 'EN',
    flag: 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.0.0/flags/4x3/gb.svg',
  },
  FR: {
    label: 'Français',
    code: 'FR',
    flag: 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.0.0/flags/4x3/fr.svg',
  },
  NL: {
    label: 'Nederlands',
    code: 'NL',
    flag: 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.0.0/flags/4x3/nl.svg',
  },
} as const;

const currentFlag = computed(
  () => langMeta[currentLanguage.value].flag,
);
const currentCode = computed(
  () => langMeta[currentLanguage.value].code,
);

function toggleDropdown() {
  isOpen.value = !isOpen.value;
}

function closeDropdown() {
  isOpen.value = false;
}

function handleSelect(lang: keyof typeof langMeta) {
  setLanguage(lang);
  closeDropdown();
}

function handleClickOutside(event: MouseEvent) {
  if (switcherRef.value && !switcherRef.value.contains(event.target as Node))
    closeDropdown();
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div class="lang-switcher" ref="switcherRef">
    <button
      class="lang-switcher__btn"
      type="button"
      @click.stop="toggleDropdown"
      aria-haspopup="true"
      :aria-expanded="isOpen ? 'true' : 'false'">
        <img
            :src="currentFlag"
            :alt="currentCode"
            width="20"
            style="vertical-align: middle;"/>
        <span>{{ currentCode }}</span>
    </button>

    <ul
      class="lang-switcher__dropdown"
      :class="{ open: isOpen }"
      role="menu">
      <li v-for="(meta, code) in langMeta" :key="code">
        <button
          class="lang-option"
          :class="{ active: code === currentLanguage }"
          type="button"
          role="menuitem"
          @click.stop="handleSelect(code as any)">
          <img
            :src="meta.flag"
            :alt="meta.code"
            width="20"
            style="vertical-align: middle;"/>
          {{ meta.label }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
    .lang-switcher {
        position: relative;
    }

    .lang-switcher__btn {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-size: var(--text-xs);
        font-weight: 600;
        color: var(--color-nav-text);
        padding: var(--space-2) var(--space-3);
        border-radius: var(--radius-md);
        border: 1px solid rgba(255, 255, 255, 0.08);
        cursor: pointer;
        transition: background var(--transition), color var(--transition);
    }

    .lang-switcher__dropdown {
        display: none;
        position: absolute;
        top: calc(100% + var(--space-2));
        right: 0;
        min-width: 148px;
        background: var(--color-surface-2);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        list-style: none;
        padding: var(--space-2);
        z-index: 200;
        overflow: hidden;
    }

    .lang-switcher__dropdown.open {
    display: block;
    }

    .lang-option {
        width: 100%;
        text-align: left;
        display: flex;
        align-items: center;
        gap: var(--space-3);
        font-size: var(--text-xs);
        font-weight: 500;
        color: var(--color-nav-muted);
        padding: var(--space-2) var(--space-3);
        border-radius: var(--radius-md);
        background: none;
        border: none;
        cursor: pointer;
        transition: background var(--transition), color var(--transition);
    }

    .lang-option:hover {
        background: rgba(255, 255, 255, 0.06);
        color: var(--color-nav-text);
    }

    .lang-option.active {
        font-weight: 700;
    }
</style>