import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flame,
  Home,
  MapPinned,
  MoonStar,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  SunMedium,
  Target,
  UserRound,
  Moon,
  NotebookPen,
  Activity,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

type Priority = 'High' | 'Medium' | 'Low'

type Task = {
  id: number
  title: string
  description: string
  time: string
  priority: Priority
  category: string
  done: boolean
}

type DateReminder = {
  id: number
  title: string
  date: string
  time: string
}

type QuickAddType = 'Task' | 'Reminder' | 'Note' | 'Event' | 'Shopping Item' | 'Checklist'

type LocationOption = {
  id: string
  label: string
  country: string
  timeZone: string
}

const locationOptions: LocationOption[] = [
  { id: 'new-york', label: 'New York', country: 'United States', timeZone: 'America/New_York' },
  { id: 'london', label: 'London', country: 'United Kingdom', timeZone: 'Europe/London' },
  { id: 'dubai', label: 'Dubai', country: 'United Arab Emirates', timeZone: 'Asia/Dubai' },
  { id: 'mumbai', label: 'Mumbai', country: 'India', timeZone: 'Asia/Kolkata' },
  { id: 'singapore', label: 'Singapore', country: 'Singapore', timeZone: 'Asia/Singapore' },
  { id: 'tokyo', label: 'Tokyo', country: 'Japan', timeZone: 'Asia/Tokyo' },
]

const initialTasks: Task[] = [
  { id: 1, title: 'Finish homework', description: 'Math chapter 4 exercises', time: '2:00 PM', priority: 'High', category: 'Study', done: true },
  { id: 2, title: 'Pack school bag', description: 'Books, laptop, water bottle', time: '5:30 PM', priority: 'Medium', category: 'Morning', done: false },
  { id: 3, title: 'Buy notebook', description: 'Blue notebook for science', time: 'Tomorrow', priority: 'Low', category: 'Shopping', done: false },
  { id: 4, title: 'Review project brief', description: 'Finalize client notes', time: '7:15 PM', priority: 'High', category: 'Work', done: false },
]

type ImportantReminder = {
  id: string
  title: string
  time: string
  type: string
}

const initialReminders: ImportantReminder[] = [
  { id: 'science-class', title: 'Science class', time: '2:00 PM', type: 'Event' },
  { id: 'electricity-bill', title: 'Pay electricity bill', time: '6:30 PM', type: 'Bill' },
  { id: 'study-session', title: 'Study session', time: '8:00 PM', type: 'Focus' },
]

const initialNotes = [
  { title: 'Math formulas', content: 'Remember the derivative rules for chapter 4.', pinned: true },
  { title: 'Weekend plan', content: 'Book train tickets and pack chargers.', pinned: false },
]

const initialShoppingItems = [
  { name: 'Milk', price: 60, done: false },
  { name: 'Bread', price: 45, done: false },
  { name: 'Eggs', price: 80, done: true },
  { name: 'Notebook', price: 120, done: false },
]

const modes = [
  { icon: Home, title: "I'm Leaving", subtitle: 'Leaving checklist', accent: 'blue' },
  { icon: BookOpen, title: "I'm Studying", subtitle: '45 min focus session', accent: 'violet' },
  { icon: ShoppingBag, title: "I'm Shopping", subtitle: 'Budget ₹500', accent: 'amber' },
  { icon: MapPinned, title: "I'm Travelling", subtitle: 'Weekend getaway', accent: 'cyan' },
  { icon: MoonStar, title: 'Going to Sleep', subtitle: 'Tomorrow prep', accent: 'slate' },
]

const suggestions = [
  { title: 'You usually study around 6 PM.', detail: 'Start a study session?', action: 'Start focus' },
  { title: 'You have 3 unfinished tasks.', detail: 'Finish your top priority before evening.', action: 'Review list' },
  { title: 'Tomorrow has an early event.', detail: 'Prepare your bag tonight.', action: 'Prepare now' },
]

const upcomingEvents = [
  { title: 'Science exam', time: '2:00 PM', location: 'Room 12' },
  { title: 'Team sync', time: '5:45 PM', location: 'Zoom' },
  { title: 'Evening run', time: '7:30 PM', location: 'Park' },
]

const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'tasks', label: 'Tasks', icon: CheckCheck },
  { id: 'profile', label: 'Profile', icon: UserRound },
]

const priorityColors: Record<Priority, string> = {
  High: 'priority-high',
  Medium: 'priority-medium',
  Low: 'priority-low',
}

const getDateKey = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)

const getActiveStreak = (dates: string[], today: string) => {
  const joinedDates = new Set(dates)
  let streak = 0
  const cursor = new Date(`${today}T00:00:00Z`)

  while (joinedDates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  return streak
}

function App() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = window.localStorage.getItem('daypilot-tasks')
    return saved ? JSON.parse(saved) : initialTasks
  })
  const [search, setSearch] = useState('')
  const [activeNav, setActiveNav] = useState('home')
  const [adminClickTimes, setAdminClickTimes] = useState<number[]>([])
  const [adminLoginOpen, setAdminLoginOpen] = useState(false)
  const [adminAuthenticated, setAdminAuthenticated] = useState(false)
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminToken, setAdminToken] = useState('')
  const [adminOverview, setAdminOverview] = useState<{ totalUsers: number; activeUsers: number; completedTasks: number; totalTasks: number; recentActivity: Array<{ title: string; created_at: string }> } | null>(null)
  const [dateReminders, setDateReminders] = useState<DateReminder[]>(() => {
    const saved = window.localStorage.getItem('daypilot-reminders')
    return saved ? JSON.parse(saved) : []
  })
  const [importantReminders, setImportantReminders] = useState<ImportantReminder[]>(() => {
    const saved = window.localStorage.getItem('daypilot-important-reminders')
    return saved ? JSON.parse(saved) : initialReminders
  })
  const [reminderTitle, setReminderTitle] = useState('')
  const [reminderDate, setReminderDate] = useState('')
  const [reminderTime, setReminderTime] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const date = new Date()
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })
  const [shoppingItems, setShoppingItems] = useState(initialShoppingItems)
  const [notes, setNotes] = useState(initialNotes)
  const [shoppingName, setShoppingName] = useState('')
  const [shoppingPrice, setShoppingPrice] = useState('')
  const [selectedMode, setSelectedMode] = useState<(typeof modes)[number] | null>(null)
  const [suggestionsVisible, setSuggestionsVisible] = useState(true)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [modesOpen, setModesOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [quickAddType, setQuickAddType] = useState<QuickAddType | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftDetails, setDraftDetails] = useState('')
  const [savedItems, setSavedItems] = useState<Array<{ id: number; type: QuickAddType; title: string; details: string }>>(() => {
    const saved = window.localStorage.getItem('daypilot-items')
    return saved ? JSON.parse(saved) : []
  })
  const [activeStreak, setActiveStreak] = useState(0)
  const [activeDaysThisMonth, setActiveDaysThisMonth] = useState(0)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = window.localStorage.getItem('daypilot-theme')
    return savedTheme === 'light' ? 'light' : 'dark'
  })
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginStep, setLoginStep] = useState<'username' | 'password'>('username')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null)
  const [locationSearch, setLocationSearch] = useState('')
  const [locationConfirmed, setLocationConfirmed] = useState(false)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('daypilot-theme', theme)
  }, [theme])

  useEffect(() => {
    const tick = () => setNow(new Date())
    tick()
    const timer = window.setInterval(tick, 60000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('daypilot-items', JSON.stringify(savedItems))
  }, [savedItems])

  useEffect(() => {
    window.localStorage.setItem('daypilot-tasks', JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    window.localStorage.setItem('daypilot-reminders', JSON.stringify(dateReminders))
  }, [dateReminders])

  useEffect(() => {
    window.localStorage.setItem('daypilot-important-reminders', JSON.stringify(importantReminders))
  }, [importantReminders])

  const activeTimeZone = selectedLocation?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const formatTimeZone = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', { ...options, timeZone: activeTimeZone }).format(now)

  const filteredLocations = useMemo(() => {
    const query = locationSearch.trim().toLowerCase()
    if (!query) return locationOptions

    return locationOptions.filter((location) => `${location.label} ${location.country} ${location.timeZone}`.toLowerCase().includes(query))
  }, [locationSearch])

  const completedTasks = tasks.filter((task) => task.done).length
  const progress = Math.round((completedTasks / tasks.length) * 100)
  const greeting = useMemo(() => {
    const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: activeTimeZone, hour: 'numeric', hour12: false }).format(now))

    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }, [activeTimeZone, now])

  const calendarDays = useMemo(() => {
    const firstDay = calendarMonth.getDay()
    const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate()
    const days = Array.from({ length: firstDay + daysInMonth }, (_, index) => (
      index < firstDay ? null : index - firstDay + 1
    ))

    while (days.length % 7 !== 0) days.push(null)
    return days
  }, [calendarMonth])

  const calendarMonthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(calendarMonth)

  const searchResults = useMemo(() => {
    if (!search.trim()) return []

    const query = search.toLowerCase()

    return [
      ...tasks.filter((task) => `${task.title} ${task.description}`.toLowerCase().includes(query)).map((task) => ({ type: 'Task', title: task.title, detail: task.category })),
      ...notes.filter((note) => `${note.title} ${note.content}`.toLowerCase().includes(query)).map((note) => ({ type: 'Note', title: note.title, detail: 'Pinned note' })),
      ...importantReminders.filter((reminder) => reminder.title.toLowerCase().includes(query)).map((reminder) => ({ type: 'Reminder', title: reminder.title, detail: reminder.time })),
      ...dateReminders.filter((reminder) => reminder.title.toLowerCase().includes(query)).map((reminder) => ({ type: 'Reminder', title: reminder.title, detail: `${reminder.date} • ${reminder.time}` })),
      ...shoppingItems.filter((item) => item.name.toLowerCase().includes(query)).map((item) => ({ type: 'Shopping', title: item.name, detail: item.price ? `₹${item.price}` : 'Item' })),
    ].slice(0, 6)
  }, [dateReminders, importantReminders, search, tasks])

  const toggleTask = (id: number) => {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task))
  }

  const removeTask = (id: number) => {
    setTasks((current) => current.filter((task) => task.id !== id))
  }

  const toggleTheme = () => {
    setTheme((current) => current === 'dark' ? 'light' : 'dark')
  }

  const handleAdminTrigger = () => {
    const now = Date.now()
    const recentClicks = [...adminClickTimes.filter((time) => now - time < 1200), now]
    setAdminClickTimes(recentClicks)
    if (recentClicks.length >= 4) {
      setAdminClickTimes([])
      setAdminLoginOpen(true)
      setAdminError('')
    }
  }

  const submitAdminLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAdminLoading(true)
    setAdminError('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUsername, password: adminPassword }),
      })
      const result = await response.json() as { error?: string; token?: string; username?: string }
      if (!response.ok || !result.token) throw new Error('Invalid admin credentials')
      setAdminToken(result.token)
      setAdminAuthenticated(true)
      setAdminLoginOpen(false)
      setAdminPassword('')
    } catch {
      setAdminError('Invalid admin credentials')
    } finally {
      setAdminLoading(false)
    }
  }

  const loadAdminOverview = async () => {
    const response = await fetch(`${API_BASE_URL}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    if (!response.ok) throw new Error('Unable to load admin overview')
    setAdminOverview(await response.json() as typeof adminOverview)
  }

  useEffect(() => {
    if (adminAuthenticated && adminToken) {
      void loadAdminOverview()
    }
  }, [adminAuthenticated, adminToken])

  const adminOverlay = adminLoginOpen ? (
    <div className="admin-backdrop" role="presentation">
      <section className="admin-login-modal" role="dialog" aria-modal="true" aria-labelledby="admin-login-title">
        <button className="quick-add-close" type="button" aria-label="Close admin login" onClick={() => setAdminLoginOpen(false)}>×</button>
        <div className="admin-modal-icon"><ShieldCheck size={22} /></div>
        <div className="eyebrow">Restricted access</div>
        <h2 id="admin-login-title">Admin login</h2>
        <p>Sign in with an authorized administrator account.</p>
        <form className="login-form" onSubmit={submitAdminLogin}>
          <label htmlFor="admin-username">Username</label>
          <input id="admin-username" value={adminUsername} onChange={(event) => setAdminUsername(event.target.value)} autoComplete="username" />
          <label htmlFor="admin-password">Password</label>
          <input id="admin-password" type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} autoComplete="current-password" />
          {adminError && <small role="alert" className="admin-error">{adminError}</small>}
          <button className="login-button" type="submit" disabled={adminLoading || !adminUsername || !adminPassword}>
            {adminLoading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </section>
    </div>
  ) : null

  if (adminAuthenticated) {
    return (
      <div className="admin-shell">
        <header className="admin-header">
          <div className="brand-row">
            <button type="button" className="brand-mark admin-trigger" onClick={handleAdminTrigger}>D</button>
            <div><div className="brand-title">DayPilot Admin</div><div className="brand-subtitle">Control center</div></div>
          </div>
          <button className="ghost-button" type="button" onClick={() => { setAdminAuthenticated(false); setAdminToken('') }}><LogOut size={15} /> Logout</button>
        </header>
        <main className="admin-main">
          <div className="admin-welcome"><div className="eyebrow">Administration</div><h1>Welcome, {adminUsername}</h1><p>Monitor your DayPilot workspace from one secure place.</p></div>
          <section className="admin-stat-grid">
            <article className="panel admin-stat"><Users size={19} /><span>Total users</span><strong>{adminOverview?.totalUsers ?? '—'}</strong></article>
            <article className="panel admin-stat"><Activity size={19} /><span>Active users</span><strong>{adminOverview?.activeUsers ?? '—'}</strong></article>
            <article className="panel admin-stat"><ShieldCheck size={19} /><span>Daily streak tasks</span><strong>{adminOverview ? `${adminOverview.completedTasks}/${adminOverview.totalTasks}` : '—'}</strong></article>
          </section>
          <section className="panel admin-activity">
            <div className="section-heading"><h3>Recent activity</h3><Settings size={17} /></div>
            {adminOverview?.recentActivity.length ? adminOverview.recentActivity.map((item, index) => <div className="admin-activity-row" key={`${item.created_at}-${index}`}><Activity size={15} /><span>{item.title}</span><small>{new Date(item.created_at).toLocaleString()}</small></div>) : <p className="admin-empty">No recent activity yet.</p>}
          </section>
        </main>
        {adminOverlay}
      </div>
    )
  }

  const logOff = () => {
    setIsLoggedIn(false)
    setLocationConfirmed(false)
    setEmailVerified(false)
    setOtpSent(false)
    setEmail('')
    setOtp('')
    setPassword('')
    setLoginStep('username')
    setActiveNav('home')
  }

  const openQuickAddEditor = (type: QuickAddType) => {
    setQuickAddOpen(false)
    setQuickAddType(type)
    setDraftTitle('')
    setDraftDetails('')
    setActiveNav('add')
  }

  const handleSuggestionAction = (action: string) => {
    if (action === 'Start focus') {
      const studyMode = modes.find((mode) => mode.title === "I'm Studying")
      if (studyMode) {
        setSelectedMode(studyMode)
        setActiveNav('mode-detail')
      }
      return
    }

    if (action === 'Review list') {
      setActiveNav('tasks')
      return
    }

    if (action === 'Prepare now') {
      setQuickAddType('Task')
      setDraftTitle('Prepare for tomorrow')
      setDraftDetails('Pack everything needed for tomorrow morning.')
      setActiveNav('add')
    }
  }

  const saveQuickAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!quickAddType || !draftTitle.trim()) return

    const item = {
      id: Date.now(),
      type: quickAddType,
      title: draftTitle.trim(),
      details: draftDetails.trim(),
    }

    setSavedItems((current) => [item, ...current])

    if (quickAddType === 'Task') {
      setTasks((current) => [...current, {
        id: item.id,
        title: item.title,
        description: item.details || 'Added from Quick Add',
        time: 'Today',
        priority: 'Medium',
        category: 'Quick Add',
        done: false,
      }])
    }

    if (quickAddType === 'Note') {
      setNotes((current) => [{
        title: item.title,
        content: item.details || 'Added from Quick Add',
        pinned: false,
      }, ...current])
    }

    setQuickAddType(null)
    setActiveNav('home')
  }

  const addShoppingItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = shoppingName.trim()
    const price = Number(shoppingPrice)

    if (!name || !Number.isFinite(price) || price < 0) return

    setShoppingItems((current) => [...current, { name, price, done: false }])
    setShoppingName('')
    setShoppingPrice('')
  }

  const toggleShoppingItem = (index: number) => {
    setShoppingItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, done: !item.done } : item
    )))
  }

  const addDateReminder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!reminderTitle.trim() || !reminderDate || !reminderTime) return

    setDateReminders((current) => [{
      id: Date.now(),
      title: reminderTitle.trim(),
      date: reminderDate,
      time: reminderTime,
    }, ...current])
    setReminderTitle('')
    setReminderDate('')
    setReminderTime('')
  }

  const removeDateReminder = (id: number) => {
    setDateReminders((current) => current.filter((reminder) => reminder.id !== id))
  }

  const removeImportantReminder = (id: string) => {
    setImportantReminders((current) => current.filter((reminder) => reminder.id !== id))
  }

  const quickAddItems = [
    { label: 'Task', icon: CheckCheck, detail: 'Plan something to finish' },
    { label: 'Reminder', icon: Bell, detail: 'Never miss an important moment' },
    { label: 'Note', icon: NotebookPen, detail: 'Capture a thought quickly' },
    { label: 'Event', icon: CalendarDays, detail: 'Schedule time on your calendar' },
    { label: 'Shopping Item', icon: ShoppingBag, detail: 'Add something to your list' },
    { label: 'Checklist', icon: Check, detail: 'Create a simple checklist' },
  ]

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cleanUsername = username.trim()

    if (isLoggingIn) return

    if (loginStep === 'username') {
      if (!cleanUsername) return
      setLoginStep('password')
      return
    }

    if (!cleanUsername || !password) return

    setIsLoggingIn(true)
    window.setTimeout(() => {
      setUsername(cleanUsername)
      setIsLoggedIn(true)
      setLocationConfirmed(false)
      setIsLoggingIn(false)
    }, 650)
  }

  const continueAfterLocation = () => {
    if (!selectedLocation) return

    const storageKey = `daypilot-joined-dates-${username.toLowerCase()}`
    const savedDates = JSON.parse(window.localStorage.getItem(storageKey) || '[]') as string[]
    const today = getDateKey(now, selectedLocation.timeZone)
    const joinedDates = [...new Set([...savedDates, today])]
    const streak = getActiveStreak(joinedDates, today)
    const monthPrefix = today.slice(0, 7)
    const daysThisMonth = joinedDates.filter((date) => date.startsWith(monthPrefix)).length

    window.localStorage.setItem(storageKey, JSON.stringify(joinedDates))
    setActiveStreak(streak)
    setActiveDaysThisMonth(daysThisMonth)
    setLocationConfirmed(true)
  }

  const sendOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cleanEmail = email.trim().toLowerCase()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEmailError('Enter a valid email address.')
      return
    }

    setIsSendingOtp(true)
    setEmailError('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      })
      const result = await response.json() as { error?: string }

      if (!response.ok) {
        throw new Error(result.error || 'Unable to send verification code.')
      }

      setEmail(cleanEmail)
      setOtpSent(true)
      setOtp('')
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : 'Unable to send verification code.')
    } finally {
      setIsSendingOtp(false)
    }
  }

  const verifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setIsVerifyingOtp(true)
    setEmailError('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp.trim() }),
      })
      const result = await response.json() as { error?: string }

      if (!response.ok) {
        throw new Error(result.error || 'That code is incorrect.')
      }

      setEmailVerified(true)
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : 'That code is incorrect.')
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  if (!isLoggedIn) {
    return (
      <main className="login-page">
        <div className="login-glow login-glow-one" />
        <div className="login-glow login-glow-two" />
        <section className="login-card">
          <div className="login-brand">
            <button type="button" className="brand-mark admin-trigger" onClick={handleAdminTrigger}>D</button>
            <div>
              <div className="brand-title">DayPilot</div>
              <div className="brand-subtitle">Personal cockpit</div>
            </div>
          </div>

          <div className="login-heading">
            <div className="eyebrow">{loginStep === 'username' ? 'Your day, elevated' : 'Welcome back'}</div>
            <h1>{loginStep === 'username' ? 'Welcome back.' : 'Enter your password.'}</h1>
            <p>{loginStep === 'username' ? 'Enter your username to continue to your personal cockpit.' : `Enter the password for @${username.trim()}.`}</p>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            {loginStep === 'username' ? (
              <>
                <label htmlFor="username">Username</label>
                <div className="login-input-wrap">
                  <UserRound size={18} />
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    placeholder="e.g. alex"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoFocus
                  />
                </div>
              </>
            ) : (
              <>
                <label htmlFor="password">Password</label>
                <div className="login-input-wrap">
                  <UserRound size={18} />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoFocus
                  />
                </div>
              </>
            )}
            <button className="login-button" type="submit" disabled={loginStep === 'username' ? !username.trim() : !password || isLoggingIn}>
              <span>{isLoggingIn ? 'Preparing your day...' : loginStep === 'username' ? 'Continue' : 'Log in'}</span>
              {isLoggingIn ? <span className="login-spinner" /> : <ChevronRight size={18} />}
            </button>
          </form>

          {loginStep === 'password' && (
            <button className="ghost-button" type="button" onClick={() => { setLoginStep('username'); setPassword('') }}>
              Use a different username
            </button>
          )}

          <div className="login-footer">
            <Sparkles size={14} />
            <span>A calmer, clearer way to move through your day.</span>
          </div>
        </section>
        {adminOverlay}
      </main>
    )
  }

  if (!locationConfirmed) {
    return (
      <main className="login-page">
        <div className="login-glow login-glow-one" />
        <div className="login-glow login-glow-two" />
        <section className="login-card" style={{ maxWidth: '720px', width: '100%' }}>
          <div className="login-brand">
            <button type="button" className="brand-mark admin-trigger" onClick={handleAdminTrigger}>D</button>
            <div>
              <div className="brand-title">DayPilot</div>
              <div className="brand-subtitle">Personal cockpit</div>
            </div>
          </div>

          <div className="login-heading" style={{ marginBottom: '1.5rem' }}>
            <div className="eyebrow">Set your place</div>
            <h1>Where are you right now?</h1>
            <p>Select your current location so DayPilot can show the right time for your day.</p>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="location-search" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Search place</label>
            <div className="login-input-wrap" style={{ width: '100%' }}>
              <Search size={18} />
              <input
                id="location-search"
                type="text"
                value={locationSearch}
                onChange={(event) => setLocationSearch(event.target.value)}
                placeholder="Search city or country"
                autoFocus
              />
            </div>
          </div>

          <div className="location-list" style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {filteredLocations.length > 0 ? filteredLocations.map((location) => (
              <button
                key={location.id}
                type="button"
                onClick={() => setSelectedLocation(location)}
                className={selectedLocation?.id === location.id ? 'quick-add-option active' : 'quick-add-option'}
                style={{
                  textAlign: 'left',
                  justifyContent: 'space-between',
                  padding: '1rem 1.1rem',
                  borderRadius: '16px',
                  border: selectedLocation?.id === location.id ? '1px solid rgba(125, 211, 252, 0.7)' : '1px solid rgba(148, 163, 184, 0.2)',
                  background: selectedLocation?.id === location.id ? 'rgba(59, 130, 246, 0.14)' : 'rgba(15, 23, 42, 0.12)',
                }}
              >
                <div>
                  <strong style={{ display: 'block', marginBottom: '0.2rem' }}>{location.label}</strong>
                  <small>{location.country}</small>
                </div>
                <ChevronRight size={16} />
              </button>
            )) : (
              <div className="panel" style={{ padding: '1rem' }}>
                <p style={{ margin: 0 }}>No places found for “{locationSearch}”. Try another city.</p>
              </div>
            )}
          </div>

          <div className="panel" style={{ marginBottom: '1.25rem', padding: '1rem 1.1rem', borderRadius: '18px' }}>
            <div className="eyebrow">Current time</div>
            <h2 style={{ margin: '0.35rem 0', fontSize: '2rem' }}>{selectedLocation ? formatTimeZone({ hour: 'numeric', minute: '2-digit' }) : '--:--'}</h2>
            <p style={{ margin: 0, color: 'var(--muted)' }}>{selectedLocation ? `${selectedLocation.label} • ${formatTimeZone({ weekday: 'long', month: 'long', day: 'numeric' })}` : 'Choose a place to view local time'}</p>
          </div>

          <button className="login-button" type="button" onClick={continueAfterLocation} disabled={!selectedLocation}>
            <span>Continue to dashboard</span>
            <ChevronRight size={18} />
          </button>
        </section>
        {adminOverlay}
      </main>
    )
  }

  if (!locationConfirmed && !emailVerified && !otpSent) {
    return (
      <main className="login-page">
        <div className="login-glow login-glow-one" />
        <div className="login-glow login-glow-two" />
        <section className="login-card">
          <div className="login-brand">
            <button type="button" className="brand-mark admin-trigger" onClick={handleAdminTrigger}>D</button>
            <div>
              <div className="brand-title">DayPilot</div>
              <div className="brand-subtitle">Personal cockpit</div>
            </div>
          </div>

          <div className="login-heading">
            <div className="eyebrow">One last step</div>
            <h1>Verify your email.</h1>
            <p>We’ll send a one-time code so your day stays private and your session is not lost after a refresh.</p>
          </div>

          <form className="login-form" onSubmit={sendOtp}>
            <label htmlFor="email">Email address</label>
            <div className="login-input-wrap">
              <span aria-hidden="true">@</span>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoFocus
              />
            </div>
            {emailError && <small role="alert" style={{ color: '#fca5a5' }}>{emailError}</small>}
            <button className="login-button" type="submit" disabled={!email.trim() || isSendingOtp}>
              <span>{isSendingOtp ? 'Sending code...' : 'Send verification code'}</span>
              <ChevronRight size={18} />
            </button>
          </form>
        </section>
        {adminOverlay}
      </main>
    )
  }

  if (!locationConfirmed && emailVerified && otpSent) {
    return (
      <main className="login-page">
        <div className="login-glow login-glow-one" />
        <div className="login-glow login-glow-two" />
        <section className="login-card">
          <div className="login-brand">
            <button type="button" className="brand-mark admin-trigger" onClick={handleAdminTrigger}>D</button>
            <div>
              <div className="brand-title">DayPilot</div>
              <div className="brand-subtitle">Personal cockpit</div>
            </div>
          </div>

          <div className="login-heading">
            <div className="eyebrow">Check your inbox</div>
            <h1>Enter your code.</h1>
            <p>We sent a six-digit verification code to <strong>{email}</strong>.</p>
          </div>

          <form className="login-form" onSubmit={verifyOtp}>
            <label htmlFor="otp">Verification code</label>
            <div className="login-input-wrap">
              <span aria-hidden="true">#</span>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </div>
            {emailError && <small role="alert" style={{ color: '#fca5a5' }}>{emailError}</small>}
            <button className="login-button" type="submit" disabled={otp.length !== 6 || isVerifyingOtp}>
              <span>{isVerifyingOtp ? 'Verifying...' : 'Continue to my day'}</span>
              <ChevronRight size={18} />
            </button>
          </form>

          <button className="ghost-button" type="button" onClick={() => { setOtpSent(false); setOtp(''); setEmailError('') }}>
            Use a different email
          </button>
        </section>
        {adminOverlay}
      </main>
    )
  }

  return (
    <div className="daypilot-shell session-enter">
      <aside className="sidebar">
        <div className="brand-row">
          <button type="button" className="brand-mark admin-trigger" onClick={handleAdminTrigger}>D</button>
          <div>
            <div className="brand-title">DayPilot</div>
            <div className="brand-subtitle">Personal cockpit</div>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={activeNav === id ? 'nav-item active' : 'nav-item'}
              onClick={() => setActiveNav(id)}
              type="button"
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="side-card">
          <div className="mini-label">Today</div>
          <div className="side-score">{progress}%</div>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
        </div>
      </aside>

      <div className="content-panel">
        <header className="topbar">
          <div className="search-wrap">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search tasks, notes, events..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="topbar-actions">
            <button className="icon-button profile-button" type="button" aria-label={activeNav === 'profile' ? 'Back to dashboard' : 'Profile'} onClick={() => setActiveNav(activeNav === 'profile' ? 'home' : 'profile')}>
              <UserRound size={18} />
            </button>
            <button className="theme-button theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              <span className="theme-icon">{theme === 'dark' ? <Moon size={15} /> : <SunMedium size={15} />}</span>
              <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
              <span className="theme-switch" aria-hidden="true">
                <span className="theme-switch-thumb" />
              </span>
            </button>
          </div>
        </header>

        {search && (
          <section className="search-panel panel">
            <div className="section-heading">
              <h3>Search results</h3>
            </div>
            <div className="search-results">
              {searchResults.length > 0 ? searchResults.map((item) => (
                <div key={`${item.type}-${item.title}`} className="search-result">
                  <span className="search-type">{item.type}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </div>
                </div>
              )) : <p>No results found for “{search}”</p>}
            </div>
          </section>
        )}

        {activeNav === 'tasks' ? (
          <main className="quick-add-page page-view">
            <section className="panel quick-add-page-card">
              <button className="profile-back-button" type="button" onClick={() => setActiveNav('home')}>
                <ArrowLeft size={16} />
                Back to dashboard
              </button>
              <div className="eyebrow">Stay on track</div>
              <div className="calendar-toolbar">
                <div>
                  <h1>Tasks</h1>
                  <p className="quick-add-page-intro">Manage everything you need to finish today.</p>
                </div>
                <button type="button" className="ghost-button" onClick={() => openQuickAddEditor('Task')}>Add task</button>
              </div>
              <div className="task-list">
                {tasks.map((task) => (
                  <div key={task.id} className={task.done ? 'task-row done' : 'task-row'}>
                    <button className="check-button" type="button" onClick={() => toggleTask(task.id)} aria-label={task.done ? `Mark ${task.title} as incomplete` : `Mark ${task.title} as complete`}>
                      {task.done ? <Check size={14} /> : null}
                    </button>
                    <div className="task-main">
                      <strong>{task.title}</strong>
                      <small>{task.description}</small>
                    </div>
                    <div className="task-meta">
                      <span className={`priority-badge ${priorityColors[task.priority]}`}>{task.priority}</span>
                      <span>{task.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </main>
        ) : activeNav === 'calendar' ? (
          <main className="quick-add-page page-view">
            <section className="panel quick-add-page-card calendar-page-card">
              <button className="profile-back-button" type="button" onClick={() => setActiveNav('home')}>
                <ArrowLeft size={16} />
                Back to dashboard
              </button>
              <div className="eyebrow">Your schedule</div>
              <div className="calendar-toolbar">
                <h1>{calendarMonthLabel}</h1>
                <div className="calendar-toolbar-actions">
                  <button type="button" className="icon-button" aria-label="Previous month" onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
                    <ChevronLeft size={18} />
                  </button>
                  <button type="button" className="ghost-button" onClick={() => setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1))}>Today</button>
                  <button type="button" className="icon-button" aria-label="Next month" onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
              <div className="calendar-grid">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="calendar-weekday">{day}</div>
                ))}
                {calendarDays.map((day, index) => {
                  const isToday = day === now.getDate()
                    && calendarMonth.getMonth() === now.getMonth()
                    && calendarMonth.getFullYear() === now.getFullYear()
                  return (
                    <div key={`${calendarMonth.toISOString()}-${index}`} className={day === null ? 'calendar-day empty' : isToday ? 'calendar-day today' : 'calendar-day'}>
                      {day && <><span>{day}</span>{[2, 5, 8].includes(day) && <small>Event</small>}</>}
                    </div>
                  )
                })}
              </div>
              <div className="calendar-events">
                <h3>Upcoming events</h3>
                {upcomingEvents.map((event) => (
                  <div key={event.title} className="upcoming-item">
                    <div className="dot" />
                    <div><strong>{event.title}</strong><small>{event.time} • {event.location}</small></div>
                  </div>
                ))}
              </div>
            </section>
          </main>
        ) : activeNav === 'shopping' ? (
          <main className="quick-add-page page-view">
            <section className="panel quick-add-page-card">
              <button className="profile-back-button" type="button" onClick={() => setActiveNav('home')}>
                <ArrowLeft size={16} />
                Back to dashboard
              </button>
              <div className="eyebrow">Shopping list</div>
              <h1>Shopping</h1>
              <p className="quick-add-page-intro">Add items and keep track of your running total.</p>
              <form className="quick-add-form" onSubmit={addShoppingItem}>
                <label htmlFor="shopping-name">Item name</label>
                <input id="shopping-name" value={shoppingName} onChange={(event) => setShoppingName(event.target.value)} placeholder="e.g. Apples" autoFocus />
                <label htmlFor="shopping-price">Price (₹)</label>
                <input id="shopping-price" type="number" min="0" step="1" value={shoppingPrice} onChange={(event) => setShoppingPrice(event.target.value)} placeholder="e.g. 120" />
                <button className="login-button quick-add-save" type="submit" disabled={!shoppingName.trim() || !shoppingPrice.trim()}>
                  Add shopping item
                </button>
              </form>
              <div className="shopping-list">
                {shoppingItems.map((item, index) => (
                  <div key={`${item.name}-${item.price}-${index}`} className={item.done ? 'shopping-item done' : 'shopping-item'}>
                    <span>{item.name}</span>
                    <span className="shopping-item-actions">
                      <button
                        type="button"
                        className={item.done ? 'shopping-strike-button active' : 'shopping-strike-button'}
                        onClick={() => toggleShoppingItem(index)}
                        aria-label={item.done ? `Mark ${item.name} as active` : `Mark ${item.name} as complete`}
                      >
                        <Check size={14} />
                      </button>
                      <span>₹{item.price}</span>
                      <button
                        type="button"
                        className="shopping-remove-button"
                        onClick={() => setShoppingItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        aria-label={`Remove ${item.name}`}
                      >
                        ×
                      </button>
                    </span>
                  </div>
                ))}
                <div className="shopping-total">
                  <span>Total</span>
                  <strong>₹{shoppingItems.reduce((total, item) => total + item.price, 0)}</strong>
                </div>
              </div>
            </section>
          </main>
        ) : activeNav === 'mode-detail' && selectedMode ? (() => {
          const ModeIcon = selectedMode.icon
          return (
          <main className="quick-add-page page-view">
            <section className="panel quick-add-page-card">
              <button className="profile-back-button" type="button" onClick={() => setActiveNav('modes')}>
                <ArrowLeft size={16} />
                Back to daily modes
              </button>
              <div className="eyebrow">Mode area</div>
              <h1>{selectedMode.title}</h1>
              <p className="quick-add-page-intro">{selectedMode.subtitle}</p>
              <div className={`mode-card ${selectedMode.accent}`} style={{ cursor: 'default' }}>
                <div className="mode-icon"><ModeIcon size={18} /></div>
                <h4>{selectedMode.title}</h4>
                <p>Set up your {selectedMode.title.toLowerCase()} routine here.</p>
              </div>
            </section>
          </main>
          )
        })() : activeNav === 'modes' ? (
          <main className="quick-add-page page-view">
            <section className="panel quick-add-page-card">
              <button className="profile-back-button" type="button" onClick={() => setActiveNav('home')}>
                <ArrowLeft size={16} />
                Back to dashboard
              </button>
              <div className="eyebrow">Your routines</div>
              <h1>Daily modes</h1>
              <p className="quick-add-page-intro">Choose a mode to focus your next part of the day.</p>
              <div className="quick-add-grid">
                {modes.map((mode) => {
                  const { icon: Icon, title, subtitle, accent } = mode
                  return (
                  <button
                    key={title}
                    className={`quick-add-option ${accent}`}
                    type="button"
                    onClick={() => {
                      setSelectedMode(mode)
                      setActiveNav('mode-detail')
                    }}
                  >
                    <span className="quick-add-icon"><Icon size={18} /></span>
                    <span>
                      <strong>{title}</strong>
                      <small>{subtitle}</small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                  )
                })}
              </div>
            </section>
          </main>
        ) : activeNav === 'add' ? (
          <main className="quick-add-page page-view">
            <section className="panel quick-add-page-card">
              <button className="profile-back-button" type="button" onClick={() => { setQuickAddType(null); setActiveNav('home') }}>
                <ArrowLeft size={16} />
                Back to dashboard
              </button>
              <div className="eyebrow">Quick add</div>
              <h1>{quickAddType}</h1>
              <p className="quick-add-page-intro">Capture it now and keep it available in your DayPilot workspace.</p>
              <form className="quick-add-form" onSubmit={saveQuickAdd}>
                <label htmlFor="quick-add-title-input">Title</label>
                <input id="quick-add-title-input" value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder={`Enter ${quickAddType?.toLowerCase()} title`} autoFocus />
                <label htmlFor="quick-add-details-input">Details</label>
                <textarea id="quick-add-details-input" value={draftDetails} onChange={(event) => setDraftDetails(event.target.value)} placeholder="Add notes or details..." rows={5} />
                <div className="quick-add-form-actions">
                  <button className="ghost-button" type="button" onClick={() => { setQuickAddType(null); setActiveNav('home') }}>Cancel</button>
                  <button className="login-button quick-add-save" type="submit" disabled={!draftTitle.trim()}>
                    Save {quickAddType}
                  </button>
                </div>
              </form>
              {savedItems.length > 0 && (
                <div className="saved-items">
                  <div className="section-heading"><h3>Recently saved</h3></div>
                  {savedItems.slice(0, 3).map((item) => <div className="saved-item" key={item.id}><span>{item.type}</span><strong>{item.title}</strong></div>)}
                </div>
              )}
            </section>
          </main>
        ) : activeNav === 'profile' ? (
          <main className="profile-page-content page-view" key="profile">
            <section className="panel profile-hero">
              <button className="profile-back-button" type="button" onClick={() => setActiveNav('home')}>
                <ArrowLeft size={16} />
                Back to dashboard
              </button>
              <div className="profile-avatar">{username.slice(0, 2).toUpperCase()}</div>
              <div className="profile-identity">
                <div className="eyebrow">Your personal profile</div>
                <h1>@{username}</h1>
                <p>Keep your momentum. Small steps become remarkable days.</p>
              </div>
              <div className="profile-status">
                <span className="status-dot" />
                Active today
              </div>
              <button className="profile-logoff-button" type="button" onClick={logOff}>
                Log off
              </button>
            </section>

            <section className="profile-stat-grid">
              <article className="panel streak-card">
                <div className="streak-orb"><Flame size={30} /></div>
                <div>
                  <span className="profile-label">Daily streak</span>
                  <strong>{activeStreak} <small>days</small></strong>
                  <p>You're building something consistent.</p>
                </div>
              </article>
              <article className="panel profile-metric-card">
                <span className="profile-label">Active days</span>
                <strong>{activeDaysThisMonth}</strong>
                <p>Days active this month</p>
              </article>
              <article className="panel profile-metric-card">
                <span className="profile-label">Today's progress</span>
                <strong>{progress}%</strong>
                <p>{completedTasks} of {tasks.length} tasks complete</p>
              </article>
            </section>

            <section className="panel streak-progress-card">
              <div className="section-heading">
                <div>
                  <h3>Streak momentum</h3>
                  <p>Four more days to reach your next milestone.</p>
                </div>
                <Flame size={20} />
              </div>
              <div className="streak-track"><span style={{ width: '75%' }} /></div>
              <div className="streak-days">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                  <span key={`${day}-${index}`} className={index < 5 ? 'streak-day complete' : 'streak-day'}>
                    {index < 5 ? <Flame size={14} /> : day}
                  </span>
                ))}
              </div>
            </section>
          </main>
        ) : (
        <main className="main-grid page-view" key={activeNav}>
          <section className="panel hero-panel">
            <div className="hero-copy">
              <div className="eyebrow">{greeting}, {username}! 👋</div>
              <h1>{formatTimeZone({ weekday: 'long', month: 'long', day: 'numeric' })}</h1>
              <div className="time-row">
                <Clock3 size={18} />
                <span>{formatTimeZone({ hour: 'numeric', minute: '2-digit' })}</span>
              </div>
            </div>

            <div className="hero-metric">
              <div className="ring" style={{ ['--progress' as string]: `${progress}%` }}>
                <span>{progress}%</span>
              </div>
            </div>
          </section>

          <section className="stats-grid">
            <article className="panel stat-card">
              <div className="stat-header">
                <Target size={18} />
                <span>Progress</span>
              </div>
              <strong>{completedTasks}/{tasks.length}</strong>
              <small>Tasks completed today</small>
            </article>

            <article className="panel stat-card">
              <div className="stat-header">
                <CalendarDays size={18} />
                <span>Upcoming</span>
              </div>
              <strong>Science</strong>
              <small>2:00 PM • Room 12</small>
            </article>

            <article className="panel stat-card">
              <div className="stat-header">
                <Bell size={18} />
                <span>Reminders</span>
              </div>
              <strong>3</strong>
              <small>High-priority due soon</small>
            </article>

            <article className="panel stat-card">
              <div className="stat-header">
                <Flame size={18} />
                <span>Active streak</span>
              </div>
              <strong>{activeStreak} days</strong>
              <small>Keep going — you're on a roll</small>
            </article>
          </section>

          <section className="panel quick-actions-panel">
            <div className="section-heading">
              <h3>Quick actions</h3>
            </div>
            <div className="action-row">
              <button type="button" onClick={() => openQuickAddEditor('Task')}>Task</button>
              <button type="button" onClick={() => openQuickAddEditor('Reminder')}>Reminder</button>
              <button type="button" onClick={() => openQuickAddEditor('Note')}>Note</button>
              <button type="button" onClick={() => openQuickAddEditor('Event')}>Event</button>
              <button type="button" onClick={() => openQuickAddEditor('Shopping Item')}>Shopping Item</button>
            </div>
          </section>

          <section className="wide-grid">
            <div className="panel tasks-panel">
              <div className="section-heading">
                <h3>Today’s tasks</h3>
                <button type="button" className="ghost-button" onClick={() => openQuickAddEditor('Task')}>Add task</button>
              </div>

              <div className="task-list">
                {tasks.map((task) => (
                  <div key={task.id} className={task.done ? 'task-row done' : 'task-row'}>
                    <button className="check-button" type="button" onClick={() => toggleTask(task.id)} aria-label={task.done ? `Mark ${task.title} as incomplete` : `Mark ${task.title} as complete`}>
                      {task.done ? <Check size={14} /> : null}
                    </button>
                    <div className="task-main">
                      <strong>{task.title}</strong>
                      <small>{task.description}</small>
                    </div>
                    <div className="task-meta">
                      <span className={`priority-badge ${priorityColors[task.priority]}`}>{task.priority}</span>
                      <span>{task.time}</span>
                    </div>
                    <button type="button" className="shopping-remove-button" onClick={() => removeTask(task.id)} aria-label={`Remove ${task.title}`}>×</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel side-stack date-reminder-panel">
              <div className="section-heading compact">
                <h3>Date reminder</h3>
              </div>
              <form className="date-reminder-form" onSubmit={addDateReminder}>
                <input id="reminder-title" aria-label="Reminder title" value={reminderTitle} onChange={(event) => setReminderTitle(event.target.value)} placeholder="What should you remember?" />
                <div className="date-reminder-fields">
                  <input aria-label="Reminder date" type="date" value={reminderDate} onChange={(event) => setReminderDate(event.target.value)} />
                  <input aria-label="Reminder time" type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} />
                </div>
                <button type="submit" className="ghost-button" disabled={!reminderTitle.trim() || !reminderDate || !reminderTime}>Add reminder</button>
              </form>
              <div className="date-reminder-list">
                {dateReminders.length > 0 ? dateReminders.map((reminder) => (
                  <div key={reminder.id} className="upcoming-item">
                    <div className="dot" />
                    <div>
                      <strong>{reminder.title}</strong>
                      <small>{reminder.date} • {reminder.time}</small>
                    </div>
                    <button type="button" className="shopping-remove-button" onClick={() => removeDateReminder(reminder.id)} aria-label={`Remove ${reminder.title}`}>×</button>
                  </div>
                )) : <small className="date-reminder-empty">No date reminders yet.</small>}
              </div>
            </div>
          </section>

          <section className="wide-grid secondary-grid">
            <div className="panel reminders-panel">
              <div className="section-heading">
                <h3>Important reminders</h3>
                <button type="button" className="ghost-button" onClick={() => document.getElementById('reminder-title')?.focus()}>Add reminder</button>
              </div>
              <div className="reminder-list">
                {importantReminders.map((reminder) => (
                  <div key={reminder.id} className="reminder-row">
                    <div className="reminder-icon"><Bell size={14} /></div>
                    <div>
                      <strong>{reminder.title}</strong>
                      <small>{reminder.time}</small>
                    </div>
                    <span className="reminder-tag">{reminder.type}</span>
                    <button type="button" className="shopping-remove-button" onClick={() => removeImportantReminder(reminder.id)} aria-label={`Remove ${reminder.title}`}>×</button>
                  </div>
                ))}
                {dateReminders.map((reminder) => (
                  <div key={reminder.id} className="reminder-row">
                    <div className="reminder-icon"><Bell size={14} /></div>
                    <div>
                      <strong>{reminder.title}</strong>
                      <small>{reminder.date} • {reminder.time}</small>
                    </div>
                    <button type="button" className="shopping-remove-button" onClick={() => removeDateReminder(reminder.id)} aria-label={`Remove ${reminder.title}`}>×</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel assistant-panel">
              <div className="section-heading">
                <h3>DayPilot AI</h3>
                <Sparkles size={16} />
              </div>
              <div className="assistant-box">
                <p>“Plan my evening.”</p>
                <button type="button" onClick={() => setAssistantOpen((current) => !current)}>
                  {assistantOpen ? 'Hide plan' : 'Ask assistant'}
                </button>
                {assistantOpen && (
                  <p className="assistant-response">
                    Finish your top-priority task, take a short break, then prepare for tomorrow.
                  </p>
                )}
              </div>
            </div>

          </section>

          <section className="bottom-grid">
            <div className="panel notes-panel">
              <div className="section-heading">
                <h3>Quick notes</h3>
                <button type="button" className="ghost-button" onClick={() => openQuickAddEditor('Note')}>New note</button>
              </div>
              <div className="notes-list">
                {notes.map((note, index) => (
                  <div key={`${note.title}-${index}`} className={`note-item ${note.pinned ? 'pinned' : ''}`}>
                    <div className="note-header">
                      <strong>{note.title}</strong>
                      <span className="note-actions">
                        {note.pinned && <Star size={14} />}
                        <button
                          type="button"
                          className="note-remove-button"
                          onClick={() => setNotes((current) => current.filter((_, noteIndex) => noteIndex !== index))}
                          aria-label={`Remove ${note.title}`}
                        >
                          ×
                        </button>
                      </span>
                    </div>
                    <p>{note.content}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel shopping-panel">
              <div className="section-heading">
                <h3>Shopping</h3>
                <button type="button" className="ghost-button" onClick={() => setActiveNav('shopping')}>Open list</button>
              </div>
              <div className="shopping-list">
                {shoppingItems.map((item, index) => (
                  <div key={`${item.name}-${item.price}-${index}`} className={item.done ? 'shopping-item done' : 'shopping-item'}>
                    <span>{item.name}</span>
                    <span className="shopping-item-actions">
                      <button
                        type="button"
                        className={item.done ? 'shopping-strike-button active' : 'shopping-strike-button'}
                        onClick={() => toggleShoppingItem(index)}
                        aria-label={item.done ? `Mark ${item.name} as active` : `Mark ${item.name} as complete`}
                      >
                        <Check size={14} />
                      </button>
                      <span>₹{item.price}</span>
                      <button
                        type="button"
                        className="shopping-remove-button"
                        onClick={() => setShoppingItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        aria-label={`Remove ${item.name}`}
                      >
                        ×
                      </button>
                    </span>
                  </div>
                ))}
                <div className="shopping-total">
                  <span>Total</span>
                  <strong>₹{shoppingItems.reduce((total, item) => total + item.price, 0)}</strong>
                </div>
              </div>
            </div>

            <div className="panel suggestion-panel">
              <div className="section-heading">
                <h3>Smart suggestions</h3>
                {suggestionsVisible && <button type="button" className="ghost-button" onClick={(event) => { event.stopPropagation(); setSuggestionsVisible(false) }}>Dismiss all</button>}
              </div>
              {suggestionsVisible ? (
                <div className="suggestion-list">
                  {suggestions.map((suggestion) => (
                    <div key={suggestion.title} className="suggestion-item">
                      <div className="suggestion-icon"><Sparkles size={14} /></div>
                      <div>
                        <strong>{suggestion.title}</strong>
                        <small>{suggestion.detail}</small>
                      </div>
                      <button type="button" onClick={(event) => { event.stopPropagation(); handleSuggestionAction(suggestion.action) }}>{suggestion.action}</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="suggestion-empty">
                  <small>Suggestions dismissed for this session.</small>
                  <button type="button" className="ghost-button" onClick={() => setSuggestionsVisible(true)}>Show suggestions</button>
                </div>
              )}
            </div>
          </section>
        </main>
        )}
      </div>

      {adminOverlay}

      {quickAddOpen && (
        <div className="quick-add-backdrop" role="presentation" onMouseDown={() => setQuickAddOpen(false)}>
          <section className="quick-add-modal" role="dialog" aria-modal="true" aria-labelledby="quick-add-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="quick-add-header">
              <div>
                <div className="eyebrow">Create something new</div>
                <h2 id="quick-add-title">Quick add</h2>
              </div>
              <button className="quick-add-close" type="button" aria-label="Close quick add" onClick={() => setQuickAddOpen(false)}>×</button>
            </div>
            <div className="quick-add-grid">
              {quickAddItems.map(({ label, icon: Icon, detail }) => (
                <button key={label} className="quick-add-option" type="button" onClick={() => openQuickAddEditor(label as QuickAddType)}>
                  <span className="quick-add-icon"><Icon size={18} /></span>
                  <span>
                    <strong>{label}</strong>
                    <small>{detail}</small>
                  </span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {modesOpen && (
        <div className="quick-add-backdrop" role="presentation" onMouseDown={() => setModesOpen(false)}>
          <section className="quick-add-modal" role="dialog" aria-modal="true" aria-labelledby="modes-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="quick-add-header">
              <div>
                <div className="eyebrow">Personalize your routine</div>
                <h2 id="modes-title">Manage daily modes</h2>
              </div>
              <button className="quick-add-close" type="button" aria-label="Close daily modes" onClick={() => setModesOpen(false)}>×</button>
            </div>
            <div className="quick-add-grid">
              {modes.map(({ icon: Icon, title, subtitle }) => (
                <button
                  key={title}
                  className="quick-add-option"
                  type="button"
                  onClick={() => {
                    setModesOpen(false)
                    setActiveNav('home')
                  }}
                >
                  <span className="quick-add-icon"><Icon size={18} /></span>
                  <span>
                    <strong>{title}</strong>
                    <small>{subtitle}</small>
                  </span>
                  <Check size={16} />
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
