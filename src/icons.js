// Icon set — Lucide, inlined as SVG (see .icon in style.css for sizing/stroke).
//
// Lucide gives each icon as an IconNode: [[tag, attrs], ...]. We serialise that
// to a string because screens build markup as template literals. Keys use the
// app's own vocabulary so a future change of icon set is a one-file edit.
import {
  Activity, ArrowLeft, ArrowLeftRight, ArrowRight, Award, Bell, BookA, BookOpen,
  BookmarkCheck, BookmarkPlus, Check, CheckCheck, ChevronRight, CircleCheckBig,
  CircleUserRound, CircleX, Combine, Copy, Delete, Download, Eye, EyeOff, Flame,
  GraduationCap, Hand, History, Hourglass, Layers, Library, LogOut, Moon,
  Palette, PenLine, Play, RefreshCw, RotateCcw, ScrollText, Search, Settings,
  Smile, Snowflake, Sparkles, Sun, SunMoon, Target, TextAlignStart, TrendingUp,
  Trash2, TriangleAlert, UserPlus, Users, Volume2, X, Zap,
} from 'lucide';

export const ICONS = {
  // chrome + navigation
  menu: TextAlignStart,
  arrow_back: ArrowLeft,
  arrow_forward: ArrowRight,
  chevron_right: ChevronRight,
  close: X,
  settings: Settings,
  user: CircleUserRound,
  logout: LogOut,

  // tabs
  local_library: Library,
  dictionary: BookA,
  monitoring: Activity,

  // books + packs
  book_2: BookOpen,

  // actions
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
  trending_up: TrendingUp,
  bolt: Zap,
  ac_unit: Snowflake, // streak freeze
  task_alt: CheckCheck, // packs completed
  notifications: Bell,

  // ai coach
  auto_awesome: Sparkles,
  school: GraduationCap,
  error: TriangleAlert,
  sentiment_satisfied: Smile,

  // auth
  visibility: Eye,
  visibility_off: EyeOff,

  // friends
  group: Users,
  person_add: UserPlus,
  content_copy: Copy,
  backspace: Delete,

  // revision
  revise: Hourglass,

  // settings / account
  delete: Trash2,
  download: Download,
  changelog: ScrollText,
  edit: PenLine,

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
