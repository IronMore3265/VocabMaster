// Icon set — Lucide, inlined as SVG (see .icon in style.css for sizing/stroke).
//
// Lucide gives each icon as an IconNode: [[tag, attrs], ...]. We serialise that
// to a string because screens build markup as template literals. Keys use the
// app's own vocabulary so a future change of icon set is a one-file edit.
import {
  Activity, ArrowLeft, ArrowLeftRight, ArrowRight, Award, Bell, BookA, BookOpen,
  BookmarkCheck, BookmarkPlus, Calendar, Check, ChevronLeft, ChevronRight,
  CircleAlert, CircleCheckBig, CircleUserRound, CircleX, Combine, Flame, Flag,
  GraduationCap, Hand, History, Layers, Library, Lock, LogOut, Mail, Menu, Minus,
  Moon, Palette, PenLine, Play, Plus, RefreshCw, RotateCcw, Search, Settings,
  Smile, Sparkles, Sun, SunMoon, Target, TriangleAlert, Trophy, Volume2, X,
} from 'lucide';

export const ICONS = {
  // chrome + navigation
  menu: Menu,
  arrow_back: ArrowLeft,
  arrow_forward: ArrowRight,
  chevron_left: ChevronLeft,
  chevron_right: ChevronRight,
  close: X,
  notifications: Bell,
  settings: Settings,
  user: CircleUserRound,
  logout: LogOut,

  // tabs
  local_library: Library,
  dictionary: BookA,
  monitoring: Activity,

  // books + packs
  menu_book: BookOpen,
  book_2: BookOpen,

  // actions
  add: Plus,
  remove: Minus,
  check: Check,
  search: Search,
  play_arrow: Play,
  replay: RotateCcw,
  flip: RefreshCw,
  volume_up: Volume2,
  bookmark_add: BookmarkPlus,
  bookmark_added: BookmarkCheck,
  touch_app: Hand,

  // exercises
  style: Layers,
  join_inner: Combine,
  edit_note: PenLine,
  compare_arrows: ArrowLeftRight,
  check_circle: CircleCheckBig,
  cancel: CircleX,

  // analytics
  local_fire_department: Flame,
  workspace_premium: Award,
  history: History,
  target: Target,
  trophy: Trophy,
  calendar: Calendar,
  flag: Flag,

  // ai coach
  auto_awesome: Sparkles,
  sparkle: Sparkles,
  school: GraduationCap,
  error: TriangleAlert,
  alert: CircleAlert,
  sentiment_satisfied: Smile,

  // auth
  mail: Mail,
  lock: Lock,

  // theme
  light: Sun,
  dark: Moon,
  theme_auto: SunMoon,
  theme: Palette,
};

const attrs = (o) => Object.entries(o).map(([k, v]) => ` ${k}="${v}"`).join('');

function missing(name) {
  console.warn(`[icons] unknown icon: "${name}"`);
  return '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 9 6 6m0-6-6 6"/>';
}

export function iconSvg(name, cls = '') {
  const node = ICONS[name];
  const body = node
    ? node.map(([tag, a]) => `<${tag}${attrs(a)}/>`).join('')
    : missing(name);
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
}
