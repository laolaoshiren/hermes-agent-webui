import fs from 'node:fs';
import path from 'node:path';
const base = 'C:/Users/Administrator/Desktop/hermes-agent-webui';
const appPath = path.join(base, 'src/App.tsx');
let app = fs.readFileSync(appPath, 'utf8');

// Ensure icons
app = app.replace(/}\s*from\s*"lucide-react";/, 'MoreHorizontal,\n  User,\n} from "lucide-react";');

// Ensure state
if (!app.includes('const [moreOpen')) {
  app = app.replace('const { t } = useTranslation();', 'const { t } = useTranslation();\n  const [moreOpen, setMoreOpen] = useState(false);\n  const closeMore = () => setMoreOpen(false);');
}

// Build replacement right block
const right = `
          <div className="ml-auto flex items-center gap-3 px-4">
            <span className="hidden sm:inline-flex text-[10px] tracking-[0.18em] uppercase text-muted-foreground">alpha</span>
            <div className="relative">
              <button type="button" onClick={() => setMoreOpen(v => !v)} className="inline-flex items-center gap-1.5 border border-border rounded-md px-2 py-1 text-[0.72rem] tracking-[0.14em] uppercase text-muted-foreground hover:text-foreground transition-colors">
                <MoreHorizontal className="h-3.5 w-3.5" />
                {t("nav.more")}
              </button>
              {moreOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md border border-border bg-popover p-1 shadow-lg z-50">
                  {[{to:'/overview',label:t('nav.overview')},{to:'/status',label:t('nav.status')},{to:'/analytics',label:t('nav.analytics')},{to:'/logs',label:t('nav.logs')},{to:'/keys',label:t('nav.keys')}].map(item => (
                    <NavLink key={item.to} to={item.to} onClick={closeMore} className="block px-3 py-2 rounded-sm text-sm text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors">{item.label}</NavLink>
                  ))}
                </div>
              )}
            </div>
            <LanguageSwitcher />
            <button type="button" aria-label="Account" className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors">
              <User className="h-4 w-4" />
            </button>
          </div>`;

// Replace from start of existing right block to closing of header container
const startToken = '<div className="ml-auto flex items-center gap-3 px-4">';
const startIdx = app.indexOf(startToken);
const endToken = '</div>\n        </div>';
const endIdx = app.indexOf(endToken, startIdx);
if (startIdx !== -1 && endIdx !== -1) {
  const before = app.slice(0, startIdx);
  const after = app.slice(endIdx + endToken.length);
  app = before + right + after;
}

// Remove foundation badge if it still exists
app = app.replace(/<Badge[\s\S]*?foundationBadge[\s\S]*?<\/Badge>\s*/g, '');

fs.writeFileSync(appPath, app, 'utf8');
console.log('Updated App.tsx');