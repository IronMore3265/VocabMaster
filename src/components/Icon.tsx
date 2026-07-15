import {
  Activity,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Award,
  Bell,
  BookA,
  BookmarkCheck,
  BookmarkPlus,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Combine,
  Flame,
  GraduationCap,
  Hand,
  History,
  Layers,
  Library,
  LogOut,
  Menu,
  PenLine,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Smile,
  Sparkles,
  Target,
  TriangleAlert,
  Volume2,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react-native';
import { type ColorValue, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Semantic icon name → Lucide component. Names are kept identical to the
 * previous Material Symbols ligatures so existing call sites (and icon names
 * stored in metadata) keep working after the migration.
 */
const ICONS = {
  volume_up: Volume2,
  search: Search,
  close: X,
  dictionary: BookA,
  local_library: Library,
  monitoring: Activity,
  auto_awesome: Sparkles,
  sentiment_satisfied: Smile,
  logout: LogOut,
  book_2: BookOpen,
  chevron_right: ChevronRight,
  menu_book: BookOpen,
  arrow_back: ArrowLeft,
  arrow_forward: ArrowRight,
  menu: Menu,
  notifications: Bell,
  error: TriangleAlert,
  school: GraduationCap,
  play_arrow: Play,
  replay: RotateCcw,
  check: Check,
  flip: RefreshCw,
  style: Layers,
  join_inner: Combine,
  edit_note: PenLine,
  compare_arrows: ArrowLeftRight,
  check_circle: CheckCircle2,
  cancel: XCircle,
  local_fire_department: Flame,
  workspace_premium: Award,
  history: History,
  target: Target,
  bookmark_added: BookmarkCheck,
  bookmark_add: BookmarkPlus,
  touch_app: Hand,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

interface Props {
  /** Semantic icon name, e.g. "menu_book", "chevron_right". */
  name: IconName | (string & {});
  size?: number;
  color?: ColorValue;
  /** Lower is lighter; defaults to a soft 1.5 stroke. */
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Renders a Lucide SVG glyph. Lucide's thin, rounded strokes read as friendlier
 * than the heavier Material Symbols set, so the default stroke is a light 1.5.
 */
export function Icon({ name, size = 24, color = '#000', strokeWidth = 1.5, style }: Props) {
  const Glyph = ICONS[name as IconName] ?? BookOpen;
  return (
    <Glyph
      size={size}
      color={color as string}
      strokeWidth={strokeWidth}
      style={style}
      absoluteStrokeWidth
    />
  );
}
