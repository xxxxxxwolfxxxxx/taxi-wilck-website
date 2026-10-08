/* Gemeinsame Seitenteile (Header, Footer) aus scripts/templates/.
   Statische Seiten tragen Marker <!--header-start-->…<!--header-end--> bzw. <!--footer-start-->…<!--footer-end-->,
   die von injectPartials() befüllt werden. */
const fs = require('node:fs'), path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, 'templates', f), 'utf8').trimEnd();

const HEADER = read('header.html');
const FOOTER = read('footer.html');

function inject(html, name, content) {
  const re = new RegExp(`<!--${name}-start-->[\\s\\S]*?<!--${name}-end-->`);
  if (!re.test(html)) throw new Error(`Marker <!--${name}-start--> fehlt`);
  return html.replace(re, () => `<!--${name}-start-->${content}<!--${name}-end-->`);
}

const injectPartials = (html) => inject(inject(html, 'header', HEADER), 'footer', FOOTER);

module.exports = { HEADER, FOOTER, injectPartials };
