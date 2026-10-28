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
