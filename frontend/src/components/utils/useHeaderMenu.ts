import { ref, computed } from 'vue'

type MenuId = 'friends' | 'lang' | 'profile' | null

const openMenu = ref<MenuId>(null)

function isMenuOpen(id: MenuId) {
  return computed(() => openMenu.value === id)
}

function toggleMenu(id: MenuId) {
  openMenu.value = openMenu.value === id ? null : id
}

function closeMenu() {
  openMenu.value = null
}

export function useHeaderMenu() {
  return { openMenu, isMenuOpen, toggleMenu, closeMenu }
}