const fs = require('fs');
let code = fs.readFileSync('src/routes/candidature.tsx', 'utf8');

const layoutFooter = `        </main>
      </div>
      <SiteFooter />
    </div>`;

// Check if layoutFooter is at the end.
if (!code.includes(layoutFooter)) {
    code = code.replace(/<\/div>\s*\);\s*\}\s*$/, `    </div>\n${layoutFooter}\n  );\n}\n`);
    fs.writeFileSync('src/routes/candidature.tsx', code);
}
