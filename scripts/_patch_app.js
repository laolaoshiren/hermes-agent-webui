const fs=require('fs');
const path=require('path');
const appPath=path.join($($root),'src','App.tsx');
let app=fs.readFileSync(appPath,'utf8');
app=app.replace(/}\s*from\s*"lucide-react";/, 'MoreHorizontal,\n  User,\n} from "lucide-react";');
if(!app.includes('const [moreOpen')){
  app=app.replace('const { t } = useTranslation();', 'const { t } = useTranslation();\n  const [moreOpen, setMoreOpen] = useState(false);\n  const closeMore = () => setMoreOpen(false);');
}
// Build right block
const right=`
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
app=app.replace(/<div className="ml-auto flex items-center gap-3 px-4">[\s\S]*?<\/div>\s*<\/div>/, right);
// Remove foundation badge if present
app=app.replace(/<Badge[\s\S]*?foundationBadge[\s\S]*?<Badge\/>|<\/Badge>/, '');
fs.writeFileSync(appPath, app, 'utf8');
// Locales
const enPath=path.join($($root),'src','locales','en','app.json');
const zhPath=path.join($($root),'src','locales','zh-CN','app.json');
const en=JSON.parse(fs.readFileSync(enPath,'utf8'));
const zh=JSON.parse(fs.readFileSync(zhPath,'utf8'));
en.appShell.foundationBadge='alpha';
zh.appShell.foundationBadge='alpha';
en.nav=en.nav||{}; zh.nav=zh.nav||{};
en.nav.more=en.nav.more||'More'; zh.nav.more=zh.nav.more||'更多';
en.nav.overview=en.nav.overview||'Overview'; zh.nav.overview=zh.nav.overview||'概览';
en.nav.status=en.nav.status||'Status'; zh.nav.status=zh.nav.status||'状态';
en.nav.analytics=en.nav.analytics||'Analytics'; zh.nav.analytics=zh.nav.analytics||'分析';
en.nav.logs=en.nav.logs||'Logs'; zh.nav.logs=zh.nav.logs||'日志';
en.nav.keys=en.nav.keys||'Keys'; zh.nav.keys=zh.nav.keys||'密钥';
fs.writeFileSync(enPath, JSON.stringify(en, null, 2), 'utf8');
fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2), 'utf8');
console.log('Patched: App.tsx + locales');