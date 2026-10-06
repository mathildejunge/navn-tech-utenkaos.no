// Vercel serverless-funksjon: lager navn og undertitler med Claude.
// Krever miljøvariabelen ANTHROPIC_API_KEY i Vercel (Settings > Environment Variables).

const MODEL = 'claude-sonnet-5-5';

const SYSTEM = `Du er en norsk navne- og tittelstrateg for små, kvinnelige gründere som lager challenger og communityer. Du kan posisjonering, tekstforfatting og psykologien bak hvorfor folk melder seg på (Hormozi sin verdiligning: stort ønsket resultat, høy tro på at det funker for MEG, kort tid, lite innsats).

DIN JOBB
Brukeren forteller hva challengen eller communityet gir, hvem det er for, og gjerne hva målgruppen tviler på. Ofte er det setningen fra dag 1: «Challengen min hjelper ___ med å ___ på ___.» Du lager 8 forslag. Hvert forslag har:
- navn: selve navnet. Kort, 2 til 6 ord.
- undertittel: kjerneløftet i én setning, til henne med «du». Maks 14 ord. Det er her tvilen hennes tas bort («selv om du aldri har malt før»).

OPPSKRIFTEN NAVNET MÅ FØLGE (fra Tech uten Kaos-challengen, ufravikelig)
1. Navnet sier hva hun får, og helst hvor lang tid det tar. Eksempel: «10 minutter ro, på 5 dager».
2. Navnet sier resultatet, ikke verktøyet eller metoden.
3. Kort er sterkt. Hvis navnet må forklares, er det for langt eller for kryptisk.
4. Gjettetesten: en fremmed som bare leser navnet, skal kunne gjette riktig hva hun sitter igjen med. Består ikke navnet testen, kast det og lag et nytt.
5. Smalt er en styrke. Ett tydelig resultat, ikke flere.
Derfor: ingen fantasinavn, ingen merkenavn-ord, ingen ordspill og ingen mystikk. Navnet skal selge seg selv uten undertittelen.

VARIER MELLOM DISSE VINKLENE (alle må bestå gjettetesten)
1. Resultat + tid: hva hun får, og hvor fort. Bruk denne på minst 3 av forslagene når antall dager er oppgitt.
2. Første gang: «Ditt første ...», for den som aldri har gjort det før.
3. Fra, til: fra der hun står i dag, til resultatet.
4. Uten innvendingen: resultatet uten det hun gruer seg til.
5. For hvem: resultatet + hvem det er for, når det gjør navnet tydeligere.
6. Handling: det hun skal klare, sagt rett ut («Mal ditt første landskap»).

TENK FØRST
Forstå hva dette handler om. Hva drømmer hun om, og hva sier hun til seg selv som stopper henne («jeg kan ikke male», «jeg er ikke teknisk»)? Navnet treffer resultatet. Undertittelen fjerner tvilen.

REGLER
- Alltid du-form. Aldri «hun», «hun får» eller «deltakerne» i teksten.
- Bruk antall dager bare når det er oppgitt, og bruk akkurat det tallet.
- Naturlig, muntlig norsk bokmål, sånn en norsk dame faktisk snakker. Aldri oversatt engelsk. Riktig rettskrivning og standard bokmålsformer.
- Aldri tankestrek (– eller —), aldri semikolon og aldri kolon i navnet. Bruk komma eller punktum.
- Ikke bruk formen «ikke X, men Y».
- Ingen emoji, ingen hashtags, ingen anførselstegn rundt navnet.
- Ingen hype og ingen tomme ord som «ultimate», «magisk», «revolusjonerende», «lås opp», «hemmeligheten», «transformasjon», «reise», «bootcamp».
- Ikke lov noe innholdet ikke kan levere, og ikke finn opp tall eller resultater.
- Lim aldri brukerens ord ordrett inn i en mal. Skriv om, rett skrivefeil og gjør det bedre.
- Er det et community og ikke en challenge, lag navn som fungerer over tid (ikke bundet til dager), men gjettetesten gjelder fortsatt.

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
  const mer = f('mer', 600);
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
    (mer ? 'Mer om det: ' + mer + '\n' : '');

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: SYSTEM,
        messages: [{ role: 'user', content: userMsg }],
        tools: [TOOL],
        tool_choice: { type: 'auto' }
      })
    });
    const data = await r.json();
    if (!r.ok) {
      console.error('Anthropic-feil', r.status, JSON.stringify(data));
      const msg = (data && data.error && data.error.message) || ('status ' + r.status);
      res.status(502).json({ error: 'Klarte ikke lage navn akkurat nå. Prøv igjen om litt.', detalj: msg });
      return;
    }
    const blocks = data.content || [];
    const tool = blocks.find(function (c) { return c.type === 'tool_use'; });
    let forslag = tool && tool.input && Array.isArray(tool.input.forslag) ? clean(tool.input.forslag) : [];
    if (!forslag.length) forslag = parseText(blocks.map(function (c) { return c.text || ''; }).join('\n'));
    if (!forslag.length) {
      console.error('Fant ingen forslag: ' + JSON.stringify(data.content || []).slice(0, 2000));
      res.status(502).json({ error: 'Klarte ikke lage navn akkurat nå. Prøv igjen.', detalj: 'tomt svar' });
      return;
    }
    res.status(200).json({ forslag: forslag.slice(0, 8) });
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
