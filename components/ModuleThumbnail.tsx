import { MODULE_CATEGORY_COLORS, getModuleCategory } from '@/lib/catalog';
import { ModuleType } from '@/lib/catalog';

export default function ModuleThumbnail({ type }: { type: ModuleType }) {
  const colors = MODULE_CATEGORY_COLORS[getModuleCategory(type.id)];
  const isWide = type.W > 2.6;
  const isStore = type.category === 'store';

  return (
    <span className="module-thumb" aria-hidden="true">
      <svg viewBox="0 0 84 38" role="presentation">
        <rect x="4" y="7" width="76" height="24" rx="2" fill={colors.fill} stroke={colors.stroke} strokeWidth="1.4" strokeDasharray={isStore ? '3 2' : undefined} />
        <line x1="10" y1="12" x2="74" y2="12" stroke={colors.stroke} strokeWidth="1" opacity=".6" />
        <line x1="10" y1="26" x2="74" y2="26" stroke={colors.stroke} strokeWidth="1" opacity=".35" />
        <line x1="22" y1="8" x2="22" y2="30" stroke={colors.stroke} strokeWidth="1" opacity=".35" />
        <line x1="42" y1="8" x2="42" y2="30" stroke={colors.stroke} strokeWidth="1" opacity=".35" />
        <line x1="62" y1="8" x2="62" y2="30" stroke={colors.stroke} strokeWidth="1" opacity=".35" />
        <path d="M 36 30 L 36 23 L 48 23 L 48 30" fill="none" stroke={colors.stroke} strokeWidth="1.5" />
        {isWide && <line x1="6" y1="19" x2="78" y2="19" stroke={colors.stroke} strokeWidth=".8" opacity=".35" />}
      </svg>
    </span>
  );
}
