# Permission emails (task L6)

Drafts for the broadcasters whose terms restrict reuse but who otherwise pass
the station rules. They were removed from the Picks on 2026-10-29 and are
**parked, not denylisted** — a yes brings any of them straight back.

**You send these, not the agent (task U3).** Send from a real address you will
read, because the reply may be a question rather than a yes or no.

Three notes before you send:

1. **Don't send one to SomaFM.** Their terms say their music licences do not
   let them authorise third-party apps, so there is nothing for them to say yes
   to, and asking anyway wastes their time. They are on the denylist.
2. **Ask one thing.** These are short on purpose. A long email asking for
   several permissions at once is easy to put off answering.
3. **Record the answer** in `docs/EXECUTION.md` Part 4, and if it is a yes, add
   the station back with a `terms` record of status `permission` whose `source`
   points at the saved reply.

---

## Radio France (FIP) — 7 channels

Their terms restrict use to "strictly personal and private use" and require
written permission for reuse and brand use. FIP is the single biggest hole in
the catalog: it was carrying jazz, electronic, rock, groove, reggae, hip-hop
and metal.

**To:** the contact form at radiofrance.com, or the FIP team directly
**Subject:** Permission to list FIP's streams in a free open-source radio player

> Bonjour,
>
> I maintain Focus AMP, a free and open-source desktop radio player
> (GPL-3.0, no adverts, no subscription, no accounts). It plays stations from
> their own public stream URLs, exactly as VLC does — it does not rebroadcast,
> record, or alter anything, and it shows the station's own name with a link
> to your site.
>
> I would like to include the FIP channels (FIP, FIP Jazz, FIP Rock, FIP
> Electro, FIP Groove, FIP Reggae, FIP Hip-Hop, FIP Metal). Your terms ask for
> written permission for this kind of use, so I am asking rather than
> assuming, and I have removed them from the app in the meantime.
>
> If it helps, the source is public and you are welcome to look at exactly what
> it does with your stream: <repository URL>.
>
> If the answer is no, that is completely fine and I will not ask again.
>
> Merci beaucoup,
> Marwan Hazem

---

## Minnesota Public Radio (The Current)

Their permissions page says no redistribution or rebroadcast, and that
licensing is handled case by case. Note their current stream URL in our records
returned 404, so ask for the right one while you are there.

**To:** the contact route on mpr.org/permissions
**Subject:** Permission to list The Current's stream in a free open-source player

> Hello,
>
> I maintain Focus AMP, a free and open-source desktop radio player (GPL-3.0,
> no adverts, no subscription, no accounts). It plays stations from their own
> public stream URLs, the way VLC does — nothing is rebroadcast, recorded or
> modified, and each station is shown under its own name with a link to its
> site.
>
> I would like to include The Current. Your permissions page asks that
> licensing be arranged case by case, so I have taken it out of the app until I
> hear from you.
>
> Two things, if you have a moment: may I list it, and is there a current
> public stream URL I should use? The one I had has started returning 404.
>
> The source is public if you would like to see what the app does with the
> stream: <repository URL>.
>
> A no is absolutely fine and I will not ask again.
>
> Thank you,
> Marwan Hazem

---

## laut.fm

Their terms forbid embedding on third-party websites. An app is arguably not a
website, but it is close enough to be worth asking rather than relying on the
distinction.

**To:** the contact address on laut.fm
**Subject:** Darf ein freier Open-Source-Radioplayer laut.fm-Streams auflisten?

> Hallo,
>
> ich entwickle Focus AMP, einen kostenlosen Open-Source-Desktop-Radioplayer
> (GPL-3.0, ohne Werbung, ohne Abo, ohne Konten). Er spielt Sender über ihre
> öffentlichen Stream-URLs ab, so wie VLC es tut — nichts wird weitergesendet,
> aufgezeichnet oder verändert, und jeder Sender wird mit seinem eigenen Namen
> und einem Link zu seiner Seite angezeigt.
>
> Ihre Nutzungsbedingungen untersagen das Einbetten auf Websites Dritter. Eine
> Desktop-Anwendung ist streng genommen keine Website, aber nah genug, dass ich
> lieber frage als annehme — ich habe die Streams bis auf Weiteres entfernt.
>
> Der Quellcode ist öffentlich, falls Sie sehen möchten, was die App mit dem
> Stream macht: <repository URL>.
>
> Ein Nein ist völlig in Ordnung, dann frage ich nicht erneut.
>
> Viele Grüße,
> Marwan Hazem

---

## NRK (Norway) — Jazz, Klassisk, Folkemusikk, P3 and more

Added 2026-10-29. NRK is the most promising single reply on this page after
Radio France. It publishes every stream URL openly at lyd.nrk.no, and the only
thing standing in the way is a sentence asking to be asked:

> Livestrømmer og kanaler fra NRK Radio er utviklet for privat bruk … enhver
> annen bruk av disse for å skape nye tjenester, uten godkjenning av NRK, er
> derfor ikke tillatt.

A yes would fill Jazz, Classical, Folk and more from one broadcaster, all of it
public-service programming with impeccable provenance.

**To:** the contact route on nrk.no
**Subject:** Tillatelse til å bruke NRK Radios strømmer i en gratis open source-radiospiller

> Hei,
>
> Jeg utvikler Focus AMP, en gratis radiospiller for skrivebordet med åpen
> kildekode (GPL-3.0, uten reklame, abonnement eller brukerkontoer). Den
> spiller kanaler fra deres egne offentlige strøm-URL-er, slik VLC gjør —
> ingenting videresendes, tas opp eller endres, og hver kanal vises med sitt
> eget navn og en lenke til deres side.
>
> Jeg vil gjerne ta med NRK Jazz, NRK Klassisk, NRK Folkemusikk og NRK P3.
> Siden lyd.nrk.no sier at annen bruk for å lage nye tjenester krever NRKs
> godkjenning, spør jeg heller enn å anta, og har holdt kanalene utenfor
> appen i mellomtiden.
>
> Kildekoden er offentlig hvis dere vil se nøyaktig hva appen gjør med
> strømmen: <repository URL>.
>
> Et nei er helt greit, og da spør jeg ikke igjen.
>
> Vennlig hilsen,
> Marwan Hazem

---

## Chillhop Music and Lofi Girl — the honest route to a Lofi genre

Added 2026-10-30, after the question "can we just use the 24/7 YouTube lofi
streams" came up. We can't: YouTube's terms permit listening in their own
player or embedding their player, and separately forbid streaming any part of
the Service anywhere else without prior written permission. Taking their audio
into this player is the thing the clause names. See also `docs/EXECUTION.md`
Part 4, where thirty SomaFM channels were removed for a far milder restriction.

But the underlying wish is reasonable, and these two are the right people to
ask. Both are **labels with named, credited artists** — which is the provenance
R1, R5 and R6 want and which almost nothing else in lofi has. The only thing
missing is a stream this app can play: both publish to YouTube and Twitch, and
neither lists a direct URL.

So ask for one. A "no" costs nothing; a "yes" fills the genre properly and with
music whose artists are paid.

**To:** the contact address on chillhop.com (and separately, lofigirl.com)
**Subject:** A direct stream URL for a free open-source radio player?

> Hello,
>
> I maintain Focus AMP, a free and open-source desktop radio player (GPL-3.0,
> no adverts, no subscription, no accounts, no tracking). It plays stations
> from their own public stream URLs, the way VLC does — nothing is
> rebroadcast, recorded or altered, and every station appears under its own
> name with a link back to its site.
>
> I would like to include your radio, and I am asking rather than working
> around anything: your streams run on YouTube and Twitch, whose terms do not
> allow another player to carry them, so I have not tried.
>
> Do you have a direct audio stream URL — Icecast, or an .m3u/.pls — that you
> would be happy for a player like this to use? If you do, may I list it?
>
> The reason I am asking you in particular: the app refuses stations whose
> music cannot be traced to real, credited artists, which rules out most of
> what calls itself lofi. You are a label with named artists, so you are one
> of the few who could fill that gap honestly.
>
> The source is public if you would like to see exactly what the app does with
> a stream: <repository URL>.
>
> A no is completely fine and I will not ask again.
>
> Thank you,
> Marwan Hazem

---

## Hunter.FM — two questions that would settle it

Added 2026-10-30. Of everything tried for the Lofi genre, this came closest:
it plays verifiably real, label-released music (Mell-ø, Hoogway, Joey
Pecoraro, Elijah Lee all check out), it has been online since 2016, and it is
run by a named company. Its terms say nothing about third-party players, which
is an acceptable footing.

It fails on one rule only — R2, "named people choose the music" — because
nobody is named anywhere on the site. Two questions fix that or settle it.

**To:** the contact address on hunter.fm
**Subject:** Duas perguntas sobre o canal Lo-Fi

> Olá,
>
> Mantenho o Focus AMP, um reprodutor de rádio gratuito e de código aberto
> para desktop (GPL-3.0, sem anúncios, sem assinatura, sem contas). Ele toca
> estações a partir das URLs públicas de transmissão, como o VLC faz — nada é
> retransmitido, gravado ou alterado, e cada estação aparece com o seu próprio
> nome e um link para o seu site.
>
> Gostaria de incluir o canal Lo-Fi. O aplicativo tem uma regra: só lista
> estações onde se possa saber quem escolhe a música, porque é assim que
> mantemos fora as estações de música gerada por IA. Duas perguntas, então:
>
> 1. Quem seleciona as faixas do canal Lo-Fi — uma equipe, um curador?
> 2. A Hunter.FM é licenciada pelo ECAD para transmissão online?
>
> Perguntei porque as faixas que ouvi são de artistas reais e creditados
> (Mell-ø, Hoogway, Joey Pecoraro, Elijah Lee), o que é raro neste gênero.
>
> O código é público, caso queiram ver o que o aplicativo faz com a
> transmissão: <repository URL>.
>
> Um "não" está perfeitamente bem.
>
> Obrigado,
> Marwan Hazem

---

## For a station whose terms are silent

Use this when adding a Pick whose terms say nothing either way. Not required —
silence is an acceptable footing under §1.5 — but a written yes is better than
an inference, particularly for a small station.

**Subject:** Quick question about listing <station> in a free radio player

> Hello,
>
> I maintain Focus AMP, a free and open-source desktop radio player (GPL-3.0,
> no adverts, no subscription, no accounts). It plays stations from their own
> public stream URLs, the way VLC does — nothing is rebroadcast, recorded or
> altered, and each station appears under its own name with a link to its site.
>
> I could not find anything on your site saying whether you mind third-party
> players, so I thought I would ask instead of guessing. May I include
> <station>?
>
> If you would rather I did not, just say so and it will not be listed — and if
> you ever change your mind in either direction, one email is enough.
>
> Thank you for the station,
> Marwan Hazem
