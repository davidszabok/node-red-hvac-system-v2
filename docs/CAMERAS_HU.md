# Biztonság · kameranézet

Az óra melletti **Biztonság** gomb a kamerák név szerinti listáját nyitja meg. Egy névre bökve csak annak a kamerának a képe töltődik be. A vissza nyíl a listára visz; az X bezárja a nézetet.

A kiválasztott kamera folyamatos, hang nélküli élő videót ad. A kamera H.264 képe változatlan felbontással, átkódolás nélkül, töredezett MP4 formában jut el a böngésző MediaSource lejátszójához. Az „Élő” jelzés csak lejátszható videó megérkezésekor jelenik meg. Bezáráskor, visszalépéskor és háttérbe kerüléskor a videókérés megszakad, az FFmpeg folyamat leáll. Kapcsolathiba után a lejátszó 5 másodperc múlva újra próbálkozik.

## Kamerák hozzáadása

Az RTSP kamerákat az iHosthoz kell hozzáadni, a hozzáférést ott beállítani. A Node-RED 5 percenként szinkronizálja a listát; a „Kamerák · iHost szinkron 5p” inject node-dal ez azonnal is kérhető. A lista az új nevekkel automatikusan bővül, a UI nem tartalmaz előre rögzített kamerahelyeket.

Az iHost API v2 `camera-stream` beállítását használjuk. A Cube `get-devices` node-ja kiszűri a kamerákat, ezért a külön kamerás ág a már meglévő belső Cube API-kapcsolat szűretlen listáját olvassa.

## Eszközönkénti engedélyezés

A kameranézet csak párosított böngészőből, az engedélyezett uibuilder oldalakról érhető el. A hozzáférés nem pusztán a kamera URL-jének elrejtésén alapul: a szerver külön, HttpOnly és SameSite cookie-val azonosítja a böngészőt. A streamcímek, kamerafelhasználónevek és jelszavak nem kerülnek a UI-ba vagy a kameralista válaszába.

Új böngészőnél a **Biztonság** lap egy 6 jegyű kódot mutat. A kód 10 percig érvényes. A Node-RED „KAMERA ENGEDÉLY · ide a kijelző kódja” inject node-jának szöveges payloadjába ezt a kódot kell beírni, majd a node-ot kézzel elindítani. Engedélyezés után a kameranézet automatikusan továbblép a listára. Minden böngésző külön engedélyt kap, amely 90 napig érvényes; a cookie törlése után új párosítás kell.

Minden új telepítésen új párosítás szükséges. A csomag nem tartalmaz korábbi böngészőengedélyt vagy kamerabeállítást.

## Későbbi desktop UI

Ugyanaz a védett kamerás kiszolgáló új uibuilder felületből is használható. Az új uibuilder URL-jét fel kell venni a kamerás hozzáférési node-ok `uiPaths` listájába; a `security.js` / `security.css` és a hozzájuk tartozó párbeszédablak újra felhasználható vagy az asztali elrendezéshez alakítható. Az asztali böngészőt külön kell párosítani.

## Helyi működés

A dekóder az iHost Node-RED környezetének `/data/dutch-turf-camera/ffmpeg` fájlja. A kamera- és engedélyadatok ugyanebben a privát könyvtárban vannak, a uibuilder nyilvános `src` mappáján kívül. A képek memóriában készülnek el; nem mentünk kameraképeket fájlba.

Egyszerre egy élő kameranézet használható. Második egyidejű élő kérés HTTP 429 választ kap; a lejátszó jelzi a foglaltságot. A böngésző csak rövid videópuffert tart, a régebbi részeket törli; lassú kliensnél a szerver visszafogja az adatküldést. 15 másodpercnyi adatkimaradás után leállítja a kamerafolyamatot. A régi, védett /frame állóképes végpont megmaradt, de a UI már a /live videóvégpontot használja.

Az FFmpeg forrása a rögzített `ffmpeg-static` b6.1.1 kiadás Linux ARM binárisa; a tényleges telepített bináris 7.0.2-static verziót jelentett. Nem szükséges újraindítani a Node-RED-et vagy folyamatos videókonverziót futtatni. A felhasználó által telepített `node-red-contrib-rtsp-client` 0.1.3 a palettában maradt; a kamerás útvonalak nem használják.

## Ellenőrzés

2026. október 18.: a Nappali valódi 1920 × 1080-as videója az alkalmazáson belüli böngészőben folyamatosan lejátszott (readyState 4, növekvő lejátszási idő); a régi puffer törlése működött. Visszalépés után a videó forrása törlődött, a szerver active:0 állapotot jelzett. Az engedély nélküli /live kérés HTTP 401 választ kapott. Minden korábban meglévő flow-node változatlan maradt, csak két új kamerás node került be. Az NSPanel saját böngészőjén a H.264/MediaSource kompatibilitás helyszíni ellenőrzése még szükséges. H.265 kameránál H.264 streamet kell választani.

A mozgásérzékelő és a későbbi nyitásérzékelők riasztási működése még nincs ebbe a felületbe bekötve. A Biztonság lap ezt külön jelzi.
