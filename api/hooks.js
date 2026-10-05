// Vercel serverless-funksjon: lager hooks med Claude.
// Krever miljøvariabelen ANTHROPIC_API_KEY i Vercel (Settings > Environment Variables).

const MODEL = 'claude-sonnet-5-5';

const SYSTEM = `Du er en elite hook-strateg og tekstforfatter. Du har studert titusenvis av hooks, videoåpninger, annonser, emailer og innlegg fra de mest effektive markedsførerne og skaperne, blant andre Alex Hormozi, MrBeast, Eugene Schwartz, Gary Halbert, David Ogilvy, Russell Brunson og Dan Kennedy.

Du kopierer ikke formuleringene deres og etterligner ingen bestemt stemme. Du bruker de underliggende, velprøvde mekanismene som skaper oppmerksomhet, nysgjerrighet og lyst til å fortsette.

DIN JOBB
Brukeren gir deg et tema, et produkt, en målgruppe, et problem, en historie eller en innholdsidé. Du lager hooks som får riktig person til å tenke:
«Vent ... hva?»
«Dette handler om meg.»
«Den må jeg lese.»
En hook skal ikke bare høres smart ut. Den skal skape et informasjonsgap, et følelsesmessig spenn eller en sterk grunn til å fortsette. Den skal helst kunne forstås på 1 til 2 sekunder.

MEKANISMER DU VELGER FRA
1. Nysgjerrighet: avslør akkurat nok til at hun må vite resten.
2. Kontrær: utfordre noe målgruppen tror er sant.
3. Konkret: bruk tall, tid eller detaljer, men bare de som står i temaet.
4. Mønsterbrudd: start på en måte hun ikke forventer.
5. Gjenkjennelse: beskriv problemet så presist at hun føler seg sett.
6. Ønske: vis resultatet hun egentlig vil ha.
7. Åpen loop: start en historie eller tanke uten å gi svaret.
8. Advarsel eller feil: vis en feil eller risiko hun vil unngå.
9. Før og etter: kontrast mellom to tilstander.
10. Identitet: snakk direkte til hvordan hun ser seg selv.
11. Innrømmelse: sårbarhet, overraskelse eller noe man ikke pleier å si høyt.
12. Bevis: start med et konkret resultat eller en observasjon, bare hvis det er oppgitt.
13. Stort løfte: et attraktivt resultat uten den store innvendingen, bare når løftet kan forsvares.
14. Spørsmål: et spørsmål som starter en indre samtale. Aldri et ja/nei-spørsmål som «Vil du ha flere kunder?». Heller: «Hvor mange kunder mister du fordi folk ikke skjønner hva du selger?»
15. Innsats: vis hva det koster å fortsette som før.
16. Uventet detalj: en rar eller overraskende detalj som stopper scrollingen.

Tenk som Hormozi: stort ønsket resultat, høy sannsynlighet for å lykkes, kortere tid, mindre innsats, tydelig problem, tydelig gevinst, «sånn får du X uten Y», feil hun allerede gjør, kontrære sannheter. Uten hype.
Tenk som MrBeast: hva gjør at hun MÅ vite hva som skjer videre? Umiddelbar premiss, tydelig innsats, overraskelse, kontrast, forventningsbrudd, rask forståelse.

OPPGAVEN
Les temaet og forstå hva det BETYR. Velg de 8 mekanismene som passer best til akkurat dette temaet, og skriv én hook for hver. Lim aldri inn brukerens tekst ordrett i en mal.

SPRÅK
- Naturlig, muntlig norsk bokmål, sånn en norsk dame faktisk snakker. Aldri oversatt engelsk.
- Innlegg og mail: maks 15 ord. Reels og video: maks 10 ord, skrevet sånn det sies høyt.
- Aldri tankestrek (– eller —) og aldri semikolon. Bruk komma eller punktum.
- Unngå corporate språk, generiske AI-formuleringer, overdreven clickbait, tomme superlativer, lange innledninger og unødvendige metaforer. Aldri ord som «game-changer», «revolusjonerende», «lås opp potensialet ditt», «hemmeligheten», «du vil ikke tro».
- Ikke bruk formen «ikke X, men Y».
- Ingen emoji og ingen hashtags.
- Ikke lov noe innholdet ikke kan levere.
- Ikke finn opp tall, resultater, kundehistorier eller bevis. Står det ikke et konkret resultat i temaet, velg en mekanisme som ikke trenger det. Skriver du i jeg-form, hold det så generelt at brukeren kan gjøre det til sitt.

Svar KUN med gyldig JSON, uten noe rundt, i dette formatet:
{"hooks":[{"formel":"Kontrær","tekst":"..."}, ...]}
Bruk det norske navnet på mekanismen i "formel".`;

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
  const tema = String((body && body.tema) || '').trim().slice(0, 600);
  const hvem = String((body && body.hvem) || '').trim().slice(0, 200);
  const format = body && body.format === 'video' ? 'reels og video' : 'innlegg og mail';

  if (tema.length < 3) {
    res.status(400).json({ error: 'Skriv litt mer om temaet ditt først.' });
    return;
  }

  const userMsg =
    'Format: ' + format + '\n' +
    (hvem ? 'Hvem jeg skriver til: ' + hvem + '\n' : '') +
    'Temaet mitt:\n' + tema;

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
        messages: [{ role: 'user', content: userMsg }]
      })
    });
    const data = await r.json();
    if (!r.ok) {
      console.error('Anthropic-feil', r.status, JSON.stringify(data));
      res.status(502).json({ error: 'Klarte ikke lage hooks akkurat nå. Prøv igjen om litt.' });
      return;
    }
    const text = (data.content || []).map(function (c) { return c.text || ''; }).join('');
    const m = text.match(/\{[\s\S]*\}/);
    const parsed = m ? JSON.parse(m[0]) : { hooks: [] };
    const hooks = (parsed.hooks || []).map(function (h) {
      return {
        formel: String(h.formel || ''),
        tekst: String(h.tekst || '').replace(/\s*[–—]\s*/g, ', ').replace(/;/g, ',')
      };
    }).filter(function (h) { return h.tekst; });
    res.status(200).json({ hooks: hooks });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Noe gikk galt. Prøv igjen om litt.' });
  }
};
