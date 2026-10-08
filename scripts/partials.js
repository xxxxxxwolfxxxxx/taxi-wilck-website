/* Gemeinsame Seitenteile (Header, Footer) aus scripts/templates/.
   Statische Seiten tragen Marker <!--header-start-->…<!--header-end-->, <!--footer-…--> und <!--form-…--> (Fahrt-Anfrage),
   die von injectPartials() befüllt werden. */
const fs = require('node:fs'), path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, 'templates', f), 'utf8').trimEnd();

const HEADER = read('header.html');
const FOOTER = read('footer.html');
const RIDE_FORM = read('ride-form.html');
const rideForm = (abholort = '') => RIDE_FORM.replace('{{abholort}}', abholort.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'));

function inject(html, name, content) {
  const re = new RegExp(`<!--${name}-start-->[\\s\\S]*?<!--${name}-end-->`);
  if (!re.test(html)) throw new Error(`Marker <!--${name}-start--> fehlt`);
  return html.replace(re, () => `<!--${name}-start-->${content}<!--${name}-end-->`);
}

const injectPartials = (html) => {
  const out = inject(inject(html, 'header', HEADER), 'footer', FOOTER);
  return out.includes('<!--form-start-->') ? inject(out, 'form', rideForm('')) : out; // Formular nur auf der Startseite
};

module.exports = { HEADER, FOOTER, rideForm, injectPartials };
