# PROCESS

Dnevni alat za zadatke, review i praćenje discipline. Deo ekosistema The Golden Circle.

Objavljeno na GitHub Pages: https://daliborsuvajcevic.github.io/Process/

## Fajlovi

- `index.html`: osnova stranice
- `app.js`: sva logika (zadaci, review, istorija, analitika, izvoz i uvoz)
- `style.css`: izgled (crna #111111, zlatna #FFB132, krem #F7F3EA)
- `assets/crown.png`: kruna iz zvaničnog logoa The Golden Circle (linijska kruna, od 23. novembra 2026)
- `assets/apple-touch-icon.png`: ikonica za početni ekran telefona

## Podaci

Svi podaci se čuvaju lokalno u browseru (localStorage), jedan ključ po danu: `process:day:YYYY-MM-DD`. Podešavanja su u ključu `process:settings`. Ništa se ne šalje na server.

Zbog toga je važna rezervna kopija: u delu Podaci preuzmi izvoz (JSON) povremeno. Pregled prikazuje podsetnik kada je izvoz stariji od 7 dana.

## Ocena procesa

Zadaci 50%, disciplina 20%, fokus 10%, dnevni review 10%, doslednost u poslednjih 7 dana 10%. Ocena se računa uživo pri svakom prikazu.

## Napomena

Raniji unosi tradova (ako postoje u browseru) ostaju u sačuvanim zapisima i u izvozu, ali se u alatu više ne prikazuju.
