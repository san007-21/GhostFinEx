/**
 * navItems.js — single source of truth for app navigation.
 * View components are referenced directly (no router needed for this phase);
 * ids double as hash values so browser back/forward works.
 */
import {
  IconBook,
  IconCalendar,
  IconChart,
  IconGhost,
  IconHome,
  IconPie,
  IconRepeat,
  IconScale,
  IconSliders,
  IconTag,
  IconTarget,
  IconWallet,
} from '../ui/icons.jsx'

import DashboardView from '../../views/DashboardView.jsx'
import OverviewView from '../../views/OverviewView.jsx'
import ExpensesView from '../../views/ExpensesView.jsx'
import SpendingView from '../../views/SpendingView.jsx'
import GoalsView from '../../views/GoalsView.jsx'
import SubscriptionsView from '../../views/SubscriptionsView.jsx'
import AffordView from '../../views/AffordView.jsx'
import WhatIfView from '../../views/WhatIfView.jsx'
import ShoppingView from '../../views/ShoppingView.jsx'
import CalendarView from '../../views/CalendarView.jsx'
import LearnView from '../../views/LearnView.jsx'

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: IconHome, View: DashboardView, group: 'Money' },
  { id: 'overview', label: 'Financial overview', icon: IconChart, View: OverviewView, group: 'Money' },
  { id: 'expenses', label: 'Expenses', icon: IconWallet, View: ExpensesView, group: 'Money' },
  { id: 'spending', label: 'Spending breakdown', icon: IconPie, View: SpendingView, group: 'Money' },
  { id: 'goals', label: 'Savings goals', icon: IconTarget, View: GoalsView, group: 'Money' },
  { id: 'subscriptions', label: 'Subscriptions', icon: IconRepeat, View: SubscriptionsView, group: 'Money' },
  { id: 'afford', label: 'Can I afford this?', icon: IconScale, View: AffordView, group: 'Decide' },
  { id: 'whatif', label: 'What-if simulation', icon: IconSliders, View: WhatIfView, group: 'Decide' },
  { id: 'shopping', label: 'Smart shopping', icon: IconTag, View: ShoppingView, group: 'Decide' },
  { id: 'calendar', label: 'Financial calendar', icon: IconCalendar, View: CalendarView, group: 'Plan' },
  { id: 'learn', label: 'Learning hub', icon: IconBook, View: LearnView, group: 'Plan' },
]

/** Bottom-of-screen mobile slots: four key views + a "More" sheet. */
export const MOBILE_BOTTOM_ITEMS = [
  NAV_ITEMS[0], // dashboard
  NAV_ITEMS[2], // expenses
  NAV_ITEMS[4], // goals
  NAV_ITEMS[9], // calendar
]

/** Default shortcut chips for the Ghost assistant. */
export const GHOST_ICON = IconGhost
