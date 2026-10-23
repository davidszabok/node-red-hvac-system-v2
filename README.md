# Node-RED HVAC és napi riport – 2026. októberi rendszer

Ez a repository az otthoni Node-RED rendszer **HVAC Core** és **Datacollecting & Summary mailer** lapjának 2026. október 18-i, anonimizált exportja. A korábbi állapot külön [archív repositoryban](https://github.com/davidszabok/node-red-hvac-reporting-legacy) érhető el.

Az új változat a szezonális padlófűtés és klíma közötti választást, a külső szobaszenzorral vezérelt klímafűtést, a fürdő páravezérelt szellőztetését, valamint az adatgyűjtés és a napi riport bővített ellenőrzését tartalmazza. A napi összefoglaló Budapest időzónában 08:05-kor készül.

**2026. október 23-i csomagfrissítés:** a repository már tartalmazza az október 18-i flow-hoz illeszkedő Dutch Turf felületet, a kamerás élőkép kliensét és a telepítési útmutatót. A flow exportja változatlan; a későbbi AUTO BE/KI fejlécgomb és annak háttérmódosításai nem részei ennek a verziónak.

## Dutch Turf az NSPanelen

Az alábbi mock kép a Dutch Turf főképernyőjét mutatja. A személyes szobaneveket elmostuk; a megjelenés egy korábbi ellenőrzési képernyőképen alapul.

![Dutch Turf főképernyő az NSPanelen, elmosott szobanevekkel](assets/dutch-turf-main-mock.png)

## Tartalom

- [`flows/hvac-and-reporting.public.json`](flows/hvac-and-reporting.public.json): a két összetartozó flow-lap és az általuk használt konfigurációs node-ok.
- [`sql/schema.sql`](sql/schema.sql): a meglévő pillanatkép- és `live_snapshot` táblák mintasémája.
- [`sql/schema-v2.sql`](sql/schema-v2.sql): a döntésnapló és a gyűjtési ciklusok két további táblája.
- [`src/dutch-turf/`](src/dutch-turf/): a teljes Dutch Turf UIBUILDER-felület, háttérképpel, kameralistával, böngészőpárosítással és H.264 élőkép-lejátszóval.
- [`docs/DUTCH_TURF_INSTALLATION_HU.md`](docs/DUTCH_TURF_INSTALLATION_HU.md): a felület és a kamerás háttér beüzemelése, FFmpeg-előkészítés és ellenőrzések.
- [`docs/CAMERAS_HU.md`](docs/CAMERAS_HU.md): kameraműködés, hozzáférés, korlátok és a korábbi helyszíni ellenőrzés eredménye.

## Importálás

1. A jelenlegi Node-RED rendszeredről készíts teljes mentést. A flow-t először elkülönített példányba importáld, vagy tiltsd le az összes fizikai kimenetet.
2. Telepítsd a szükséges Node-RED csomagokat: `node-red-contrib-ihost`, `node-red-contrib-dirigera`, `node-red-contrib-uibuilder`, `node-red-contrib-melcloud`, `node-red-node-email`, `node-red-node-mysql`, `node-red-contrib-google-sheets`.
3. Üres adatbázison hozd létre a táblákat a két SQL-fájllal. Meglévő adatbázisnál előbb hasonlítsd össze a tényleges táblákat, és készíts mentést.
4. Importáld a JSON-t a Node-RED szerkesztőben. Állítsd be az iHost-, DIRIGERA-, MELCloud-, MySQL-, Google Sheets- és SMTP-kapcsolatot.
5. Keress rá az összes `REPLACE_WITH_`, `example.com` és `192.0.2.10` mintára. Az eszközazonosítókat a Function node-ok saját térképeiben is pótolni kell. A helyi webes végpontokat, időjárási koordinátákat és UIBUILDER-forrásfájlokat a saját telepítésedhez kell igazítani.
6. Ellenőrizd a szenzorok frissességét, a relé- és klíma-visszajelzéseket, az SQL írásokat és az előnézeti HTML-riportot. Csak ezután engedélyezd az éles vezérlést és az e-mail küldést.

Az export **nem kulcsrakész telepítő**. A helyettesített címek és azonosítók szándékosan érvénytelenek. A Dutch Turf forrásfájljait a [részletes útmutató](docs/DUTCH_TURF_INSTALLATION_HU.md) szerint kell telepíteni; a régi `nscompact` és `nsdesktop2` képernyők forrása a [külön dashboard repositoryban](https://github.com/davidszabok/nspanel-node-red-dashboard) található. A rendszer többi tíz, más célú flow-lapja nincs ebben a csomagban.

## Közzététel és biztonság

A publikus JSON nem tartalmaz Node-RED credential fájlt, valós jelszót vagy tokent. A személyes e-mail-címek, belső IP-címek, helyi domainek, eszköz- és Google Sheet-azonosítók helyettesítő értéket kaptak. A nyers élő export és az adatbázismentések nem részei ennek a repositorynak.

A flow kazánt, szivattyút, szelepeket, klímát és szellőztetést is vezérelhet. A fizikai fagy-, túlmelegedés-, áramlás- és villamos védelemről a telepítésben külön kell gondoskodni. Hibás csatornakiosztás anyagi kárt okozhat.

## Megjegyzés a napi riporthoz

Az adatgyűjtő külön jelzi a részleges vagy sikertelen mentési ciklust, a nem ismert reléállapotot és az offline szenzort. A döntésnaplóban az eszköz által adott mérési idő és a rendszerhez érkezés ideje külön adat. A napi riport a hiányzó mintákat nem számolja nullának vagy igazolt működési időnek.
