const fs = require('fs');
let code = fs.readFileSync('src/routes/candidature.tsx', 'utf8');

const badPart = `        </main>
      </div>
      <SiteFooter />
    </div>
  );
}`;

if (code.includes(badPart)) {
    // it seems the closing tags were added correctly, but the layout header replacement probably messed up some open tags?
    // Let's just restore the file completely to original, then apply the changes carefully using string replacement of EXACT snippets.
}
