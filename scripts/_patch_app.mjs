import fs from 'node:fs';
import path from 'node:path';
const base = 'C:/Users/Administrator/Desktop/hermes-agent-webui';
const R = (p) => path.join(base, p);
const appPath = R('src/App.tsx');
let app = fs.readFileSync(appPath, 'utf8');

// 1) Add MoreHorizontal + User icons
app = app.replace(/}\s*from\s*"lucide-react";/, 'MoreHorizontal,\n  User,\n} from "lucide-react";');

// 2) Add local state for More dropdown
if (!app.includes('const [moreOpen')) {
  app = app.replace('const { t } = useTranslation();', 'const { t } = useTranslation();\n  const [moreOpen, setMoreOpen] = useState(false);\n  const closeMore = () => setMoreOpen(false);');
}

// 3) Replace the right header block: include Alpha, More dropdown, LanguageSwitcher, Account icon
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

// Find existing right block start
const marker = '<div className="ml-auto flex items-center gap-3 px-4">';
const start = app.indexOf(marker);
if (start !== -1) {
  const endToken = '</div>\n        </div>';
  const end = app.indexOf(endToken, start);
  if (end !== -1) {
    const before = app.slice(0, start);
    const after = app.slice(end + endToken.length);
    app = before + right + after;
  }
}

// 4) Remove foundation badge element if present
app = app.replace(/<Badge[\s\S]*?foundationBadge[\s\S]*?<\/Badge>\s*/g, '');

fs.writeFileSync(appPath, app, 'utf8');

// 5) Locales update: set foundationBadge to alpha; add nav keys if missing
function patchLocale(localePath, moreLabel, overviewLabel, statusLabel, analyticsLabel, logsLabel, keysLabel) {
  const obj = JSON.parse(fs.readFileSync(localePath, 'utf8'));
  obj.appShell = obj.appShell || {};
  obj.appShell.foundationBadge = 'alpha';
  obj.nav = obj.nav || {};
  obj.nav.more = obj.nav.more || moreLabel;
  obj.nav.overview = obj.nav.overview || overviewLabel;
  obj.nav.status = obj.nav.status || statusLabel;
  obj.nav.analytics = obj.nav.analytics || analyticsLabel;
  obj.nav.logs = obj.nav.logs || logsLabel;
  obj.nav.keys = obj.nav.keys || keysLabel;
  fs.writeFileSync(localePath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

patchLocale(R('src/locales/en/app.json'), 'More', 'Overview', 'Status', 'Analytics', 'Logs', 'Keys');
patchLocale(R('src/locales/zh-CN/app.json'), '更多', '概览', '状态', '分析', '日志', '密钥');

console.log('Patched: src/App.tsx, src/locales/en/app.json, src/locales/zh-CN/app.json');