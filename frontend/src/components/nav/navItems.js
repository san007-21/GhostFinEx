/**
 * navItems.js — single source of truth for app navigation.
 * Views are referenced as lazy `load` functions (route-level code splitting:
 * each view ships as its own chunk and loads on first navigation). Ids double
 * as hash values so browser back/forward works.
 */
import {
  IconBook,
  IconCalendar,
  IconChart,
  IconGhost,
  IconHome,
  IconPiggyBank,
  IconPie,
  IconRepeat,
  IconScale,
  IconSliders,
  IconTag,
  IconTarget,
  IconUser,
  IconWallet,
} from '../ui/icons.jsx'

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: IconHome, load: () => import('../../views/DashboardView.jsx'), group: 'Money' },
  { id: 'overview', label: 'Financial overview', icon: IconChart, load: () => import('../../views/OverviewView.jsx'), group: 'Money' },
  { id: 'expenses', label: 'Expenses', icon: IconWallet, load: () => import('../../views/ExpensesView.jsx'), group: 'Money' },
  { id: 'spending', label: 'Spending breakdown', icon: IconPie, load: () => import('../../views/SpendingView.jsx'), group: 'Money' },
  { id: 'accounts', label: 'Accounts', icon: IconWallet, load: () => import('../../views/AccountsView.jsx'), group: 'Money' },
  { id: 'goals', label: 'Savings goals', icon: IconTarget, load: () => import('../../views/GoalsView.jsx'), group: 'Money' },
  { id: 'savings', label: 'Savings', icon: IconPiggyBank, load: () => import('../../views/SavingsView.jsx'), group: 'Money' },
  { id: 'subscriptions', label: 'Subscriptions', icon: IconRepeat, load: () => import('../../views/SubscriptionsView.jsx'), group: 'Money' },
  { id: 'afford', label: 'Can I afford this?', icon: IconScale, load: () => import('../../views/AffordView.jsx'), group: 'Decide' },
  { id: 'whatif', label: 'What-if simulation', icon: IconSliders, load: () => import('../../views/WhatIfView.jsx'), group: 'Decide' },
  { id: 'shopping', label: 'Smart shopping', icon: IconTag, load: () => import('../../views/ShoppingView.jsx'), group: 'Decide' },
  { id: 'calendar', label: 'Financial calendar', icon: IconCalendar, load: () => import('../../views/CalendarView.jsx'), group: 'Plan' },
  { id: 'learn', label: 'Learning hub', icon: IconBook, load: () => import('../../views/LearnView.jsx'), group: 'Plan' },
  { id: 'account', label: 'Account', icon: IconUser, load: () => import('../../views/AuthView.jsx'), group: 'Plan' },
]

/** Bottom-of-screen mobile slots: four key views + a "More" sheet. */
export const MOBILE_BOTTOM_ITEMS = ['dashboard', 'expenses', 'goals', 'calendar'].map(
  (id) => NAV_ITEMS.find((item) => item.id === id),
)

/** Default shortcut chips for the Ghost assistant. */
export const GHOST_ICON = IconGhost
