const fs = require('fs');
let code = fs.readFileSync('src/routes/candidature.tsx', 'utf8');

// Replace the route definition to be public
code = code.replace(/"\/_authenticated\/candidature"/, '"/candidature"');

// Fix imports
if (!code.includes('SiteFooter')) {
    code = code.replace('import { createFileRoute } from "@tanstack/react-router";', 'import { createFileRoute, Link } from "@tanstack/react-router";\nimport { SiteFooter } from "@/components/Footer";');
}

// Ensure the layout matches the public site.
// We need to replace the return statement with the Site Layout.
// The public layout starts with:
const layoutHeader = `    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500/30 selection:text-amber-200 flex flex-col justify-between">
      <div>
        <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-amber-500/20 px-4 lg:px-8 py-3 transition-all">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                ♠
              </div>
              <div>
                <div className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent uppercase">
                  Casinò Revenge
                </div>
                <div className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">
                  Liberty Bay • Lavora con noi
                </div>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <Link to="/" className="hover:text-amber-400 transition-colors">
                Home & Guida
              </Link>
              <Link to="/ciurma" className="hover:text-amber-400 transition-colors">
                La Ciurma
              </Link>
              {profile ? (
                 <Link to="/dashboard" className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/30">
                   Pannello Gestionale
                 </Link>
              ) : (
                 <Link to="/auth" className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/30">
                   Accedi
                 </Link>
              )}
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8 lg:py-12">
          <div className="space-y-8 py-2">`;

const layoutFooter = `        </main>
      </div>
      <SiteFooter />
    </div>`;

// Replace `return (\n    <div className="space-y-8 py-2">` with layoutHeader
code = code.replace(/return \(\s*<div className="space-y-8 py-2">/g, `return (\n${layoutHeader}`);

// find the last `</div>  );` and replace with `</div>${layoutFooter}  );`
code = code.replace(/<\/div>\s*\);\s*}\s*$/m, `</div>\n${layoutFooter}\n  );\n}\n`);

// Wait, the first replacement might accidentally replace the `return` inside `if (isBuildingForm)`.
// We should fix that if it happened.
code = code.replace(/if \(isBuildingForm\) \{[\s\S]*?return \([\s\S]*?FormBuilderView[\s\S]*?<\/div>[\s\S]*?<\/main>[\s\S]*?<\/div>\s*<SiteFooter \/>\s*<\/div>\s*\);/m, (match) => {
    // If it incorrectly replaced the early return, let's restore it
    return `if (isBuildingForm) {
    return (
      <div className="space-y-8 py-2">
        <FormBuilderView
          form={editingForm}
          onClose={() => {
            setIsBuildingForm(false);
            setEditingForm(null);
          }}
          currentUserId={user?.id}
        />
      </div>
    );`;
});

// Update permissions check
// We need to require "candidature.gestisci" or "candidature.visualizza" to manage/review forms.
// Actually, `canManageForms` is already:
// isAdmin || permissions.includes("candidature.gestisci") || permissions.includes("ruoli.gestisci");
// Let's modify it to specifically only use "candidature.gestisci".
code = code.replace(/const canManageForms =[\s\S]*?;/, `const canManageForms = isAdmin || permissions.includes("candidature.gestisci");`);
code = code.replace(/const canReview =[\s\S]*?;/, `const canReview = isAdmin || permissions.includes("candidature.gestisci") || permissions.includes("candidature.visualizza");`);

fs.writeFileSync('src/routes/candidature.tsx', code);
