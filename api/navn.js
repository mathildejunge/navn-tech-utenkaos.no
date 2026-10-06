// Vercel serverless-funksjon: lager navn og undertitler med Claude.
// Krever miljøvariabelen ANTHROPIC_API_KEY i Vercel (Settings > Environment Variables).

const MODEL = 'claude-sonnet-5-5';

const SYSTEM = `Du er en norsk navne- og tittelstrateg for små, kvinnelige gründere som lager challenger og communityer. Du kan posisjonering, tekstforfatting og psykologien bak hvorfor folk melder seg på (Hormozi sin verdiligning: stort ønsket resultat, høy tro på at det funker for MEG, kort tid, lite innsats).

DIN JOBB
Brukeren forteller hva challengen eller communityet gir, hvem det er for, gjerne hva målgruppen tviler på, og noen ganger hele skissen med dagene. Ofte er det setningen fra dag 1: «Challengen min hjelper ___ med å ___ på ___.» Du lager 8 forslag. Hvert forslag har:
- navn: selve navnet.
- undertittel: kjerneløftet i én setning, til henne med «du». Maks 16 ord. Her tas tvilen hennes bort («selv om du aldri har malt før»).

OPPSKRIFTEN NAVNET MÅ FØLGE (fra Tech uten Kaos-challengen, ufravikelig)
1. Navnet skal si TRE ting: hva hun får (resultatet), hvem det er for, og hvor lenge det varer. Eksempel: «Ut døra uten kaos, for mammaer til nevrodivergente barn, på 5 dager». Det holder ikke at antall dager står et annet sted. Det skal stå i navnet.
2. Hvem skal være så spesifikt at feil person ikke føler seg truffet. «Mammaer til nevrodivergente barn», ikke «mammaer» eller «foreldre», som også treffer de med barn i trassalder. «Kvinner som ...» er bedre enn «folk som ...». Bruk det mest presise hvem du har fått, og gjør det aldri mer generelt.
3. Navnet sier resultatet, ikke verktøyet eller metoden. Poetiske og abstrakte navn som «Fra trygge mønstre til å stå stødig» er for vage. De sier ikke hvem det er for eller hva hun konkret sitter igjen med.
4. Kort er sterkt. Hvis navnet må forklares, er det for langt eller for kryptisk. Maks 10 ord, helst færre. Bruk korte ord for hvem («nevromammaer» er bedre enn en lang omskrivning, hvis det er et ord målgruppa selv bruker).
5. Gjettetesten: en fremmed som bare leser navnet, skal kunne gjette riktig hva hun får, og om det er for henne. Består ikke navnet testen, kast det og lag et nytt.
6. Smalt er en styrke. Ett tydelig resultat, ikke flere.
7. Har du fått dagene eller innholdet: let etter den sterkeste setningen eller formuleringen i teksten hennes. Navnet ligger ofte allerede der. Bruk den, men gjør den kortere og tydeligere.

Mangler hvem: lag likevel navn med resultat og tid, og la undertittelen være så presis som mulig. Finn aldri på en målgruppe.

VARIER MELLOM DISSE VINKLENE (alle må følge oppskriften over)
1. Resultat + hvem + tid. Bruk denne på minst 4 av forslagene.
2. Første gang: «Ditt første ...», for den som aldri har gjort det før.
3. Fra, til: fra der hun står i dag, til resultatet.
4. Uten innvendingen: resultatet uten det hun gruer seg til.
5. Fra innholdet: den sterkeste formuleringen fra dagene hennes, gjort om til et navn.

TENK FØRST
Forstå hva dette handler om. Hvem er hun helt konkret, hva drømmer hun om, og hva sier hun til seg selv som stopper henne? Navnet treffer resultatet og henne. Undertittelen fjerner tvilen.

REGLER
- Alltid du-form. Aldri «hun», «hun får» eller «deltakerne» i teksten.
- Bruk antall dager bare når det er oppgitt, og bruk akkurat det tallet.
- Naturlig, muntlig norsk bokmål, sånn en norsk dame faktisk snakker. Aldri oversatt engelsk. Riktig rettskrivning og standard bokmålsformer. Dobbeltsjekk stavingen (e-postliste, mailliste, gründer).
- Ingen engelske ord når det finnes et vanlig norsk ord. Aldri «scratch», «leads», «mindset», «boost», «bootcamp», «journey».
- Ingen fagord målgruppa ikke bruker selv. Bruker brukeren et fagord (som «optin» eller «konverterer»), skriv heller hva det betyr for henne («folk melder seg på lista di»).
- Aldri tankestrek (– eller —), aldri semikolon og aldri kolon i navnet. Bruk komma eller punktum.
- Ikke bruk formen «ikke X, men Y».
- Ingen emoji, ingen hashtags, ingen anførselstegn rundt navnet.
- Ingen hype og ingen tomme ord som «ultimate», «magisk», «revolusjonerende», «lås opp», «hemmeligheten», «transformasjon», «reise».
- Ikke lov noe innholdet ikke kan levere, og ikke finn opp tall eller resultater.
- Lim aldri brukerens ord ordrett inn som et forslag. Hvert navn skal være omskrevet og bedre enn det hun skrev selv.
- Er det et community og ikke en challenge, lag navn som fungerer over tid (ikke bundet til dager), men hvem og resultat gjelder fortsatt.

Lever ALLTID de 8 forslagene ved å kalle verktøyet lever_navn, og skriv ingenting annet. Hvis du av en eller annen grunn ikke kan bruke verktøyet, skriv ett forslag per linje i formatet: vinkel :: navn :: undertittel «vinkel» er det norske navnet på vinkelen du brukte.`;

const TOOL = {
  name: 'lever_navn',
  description: 'Leverer de ferdige navneforslagene.',
  input_schema: {
    type: 'object',
    properties: {
      forslag: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            vinkel: { type: 'string', description: 'Vinkelen som er brukt, på norsk' },
            navn: { type: 'string', description: 'Selve navnet, 2 til 6 ord' },
            undertittel: { type: 'string', description: 'Én setning i du-form, maks 14 ord' }
          },
          required: ['vinkel', 'navn', 'undertittel']
        }
      }
    },
    required: ['forslag']
  }
};

function tidy(s) {
  return String(s || '')
    .replace(/^["«“]+|["»”]+$/g, '')
    .replace(/\s*[–—]\s*/g, ', ')
    .replace(/;/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

function clean(list) {
  return list.map(function (f) {
    return { vinkel: tidy(f.vinkel), navn: tidy(f.navn).replace(/[.]+$/, ''), undertittel: tidy(f.undertittel) };
  }).filter(function (f) { return f.navn; });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Bruk POST' });
    return;
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'API-nøkkelen mangler på serveren.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  function f(k, max) { return String((body && body[k]) || '').trim().slice(0, max); }
  const res1 = f('resultat', 300);
  const hvem = f('hvem', 200);
  const tvil = f('tvil', 300);
  const mer = f('mer', 3000);
  const mode = body && body.mode === 'community' ? 'community' : 'challenge';
  const days = ['3', '5', '7'].indexOf(String(body && body.days)) > -1 ? String(body.days) : '';

  if (res1.length < 3) {
    res.status(400).json({ error: 'Skriv hva hun sitter igjen med først.' });
    return;
  }

  const userMsg =
    'Type: ' + (mode === 'community' ? 'community (varer over tid)' : 'challenge') + '\n' +
    (mode === 'challenge' && days ? 'Antall dager: ' + days + '\n' : '') +
    'Hva hun sitter igjen med: ' + res1 + '\n' +
    (hvem ? 'Hvem det er for: ' + hvem + '\n' : '') +
    (tvil ? 'Hva hun tviler på eller tror hun ikke får til: ' + tvil + '\n' : '') +
    (mer ? 'Dagene og innholdet hennes:\n' + mer + '\n' : '');

  async function call(noThink) {
    const payload = {
      model: MODEL,
      max_tokens: 3000,
      system: SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
      tools: [TOOL],
      tool_choice: { type: 'auto' }
    };
    if (noThink) payload.thinking = { type: 'disabled' };
    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });
  }

  async function ask() {
    // Uten tenking går det mye raskere. Godtar ikke modellen det, prøver vi vanlig.
    let r = await call(true);
    if (r.status === 400) r = await call(false);
    const data = await r.json();
    if (!r.ok) {
      console.error('Anthropic-feil', r.status, JSON.stringify(data));
      return { feil: (data && data.error && data.error.message) || ('status ' + r.status) };
    }
    const blocks = data.content || [];
    const tool = blocks.find(function (c) { return c.type === 'tool_use'; });
    let raw = tool && tool.input ? tool.input.forslag : null;
    if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch (e) { raw = parseText(raw); } }
    if (raw && !Array.isArray(raw) && Array.isArray(raw.forslag)) raw = raw.forslag;
    let forslag = Array.isArray(raw) ? clean(raw) : [];
    if (!forslag.length) forslag = parseText(blocks.map(function (c) { return c.text || ''; }).join('\n'));
    if (!forslag.length) console.error('Tomt svar (' + data.stop_reason + '): ' + JSON.stringify(blocks).slice(0, 1500));
    return { forslag: forslag, stop: data.stop_reason };
  }

  try {
    let svar = await ask();
    if (!svar.feil && !svar.forslag.length) svar = await ask(); // prøv én gang til
    if (svar.feil) {
      res.status(502).json({ error: 'Klarte ikke lage navn akkurat nå. Prøv igjen om litt.', detalj: svar.feil });
      return;
    }
    if (!svar.forslag.length) {
      res.status(502).json({ error: 'Klarte ikke lage navn akkurat nå. Trykk en gang til.', detalj: 'tomt svar, ' + svar.stop });
      return;
    }
    res.status(200).json({ forslag: svar.forslag.slice(0, 8) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Noe gikk galt. Prøv igjen om litt.' });
  }
};

function parseText(text) {
  var out = [];
  text.split(/\r?\n/).forEach(function (line) {
    var parts = line.replace(/^[-*\d.)\s]+/, '').split('::');
    if (parts.length >= 3) out.push({ vinkel: parts[0], navn: parts[1], undertittel: parts.slice(2).join(' ') });
  });
  if (!out.length) {
    try {
      var m = text.match(/\{[\s\S]*\}/);
      var j = m ? JSON.parse(m[0]) : null;
      (j && j.forslag || []).forEach(function (f) { out.push(f); });
    } catch (e) {}
  }
  return clean(out);
}
