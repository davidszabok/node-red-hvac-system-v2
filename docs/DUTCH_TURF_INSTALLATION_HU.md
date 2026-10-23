# Dutch Turf és kamerás élőkép telepítése

Ez az útmutató a repository 2026. október 18-i anonimizált flow-jához és a `src/dutch-turf/` felülethez tartozik. A 2026. október 23-i frissítés a hiányzó kliensfájlokat és dokumentációt adja hozzá, a vezérlési flow-t nem módosítja. Az október 19-i AUTO BE/KI fejlécgomb nincs ebben a csomagban.

## A felület másolása

1. Kövesd a [fő README](../README.md#importálás) importálási és kapcsolatbeállítási lépéseit. Meglévő rendszeren előbb mentsd a flow-t és a UIBUILDER fájlokat. A teljes exportot ne importáld rá még egyszer egy már működő példányra.
2. A `Dutch-Turf 1.0` UIBUILDER node URL-je legyen `dutch-turf`. Az exportban ez a node és a `Dutch Turf · snapshot + validated commands` Function már össze van kötve. A forráskörnyezet UIBUILDER 7.7.4-et használt.
3. A repository `src/dutch-turf/` mappájának **tartalmát** másold a node tényleges `src` mappájába (az eredeti környezetben `/data/uibuilder/dutch-turf/src/`). Mind a hat fájl szükséges: `index.html`, `index.css`, `index.js`, `security.css`, `security.js`, `atlas.svg`.
4. A `../uibuilder/uibuilder.iife.min.js` fájlt maga a UIBUILDER szolgálja ki; nem kell a repositoryból másolni. A CSS a helyi `atlas.svg` háttérképet használja, külső képszolgáltatás nélkül.
5. Deploy után nyisd meg a Node-RED saját címén a `/dutch-turf/` oldalt, és végezz cache-t megkerülő újratöltést. A felületet ugyanarról a címről kell megnyitni, amely a kamerás HTTP-végpontokat is kiszolgálja.

Az anonimizált felület a `gyerek` zónát „Gyerekszoba” néven mutatja; a hozzá tartozó fűtési visszajelzésben is `gyerekszoba` szöveget keres. A saját szobanevekhez igazítsd együtt az összesítő, a Dutch Turf Function és a kliens térképeit. A kapcsolat- és eszközhelyettesítők feloldása nélkül nincs valós eszközvezérlés.

## Kamerás háttér

A kamerás node-ok a teljes `flows/hvac-and-reporting.public.json` export részei. A kliens az alábbi, azonos eredetű végpontokat használja:

| Végpont | Feladat |
| --- | --- |
| `/dutch-security/access` | Böngészőengedély ellenőrzése és párosítási kód |
| `/dutch-security/cameras` | Kameranevek és online állapot, hozzáférési adatok nélkül |
| `/dutch-security/cameras/:id/live` | Védett H.264 videó MP4-konténerben |
| `/dutch-security/cameras/:id/frame` | Megmaradt, védett JPEG-végpont |

1. Add hozzá a H.264 RTSP kamerákat az iHostban, és ott add meg a kamerák hozzáférési adatait.
2. Az `iHost kamerák · meglévő Cube API-kapcsolat` HTTP Request node `https://example.com/REPLACE_WITH_ENDPOINT` mintacímét cseréld a saját Cube API-kapcsolat eszközlista-végpontjára. Az eredeti környezet a belső `/ewelink-cube-api-v1/get-device-list` útvonalat használta POST kéréssel és JSON-válasszal. A belső cím és hitelesítés a saját iHost/Node-RED telepítésedtől függ; a nyilvános mintacím nem működő kapcsolat. A mentő Function `error: 0` és `data.device_list` válaszstruktúrát vár.
3. A Function node-ok `libs` listája a beépített `fs`, `crypto` és `child_process` modulokat használja. Biztosítsd ezek elérhetőségét a Node-RED Function modulbeállításaiban; ezekhez nem kell azonos nevű npm-csomagot telepíteni.
4. A Node-RED folyamat felhasználója írhassa a privát `/data/dutch-turf-camera/` könyvtárat. Ez maradjon a UIBUILDER nyilvános `src` mappáján kívül. A `cameras.json` és `access.json` futás közben keletkezik; ezeket ne másold másik telepítésre és ne töltsd fel GitHubra.
5. Az FFmpeg telepítése után kézzel indítsd a `Kamerák · iHost szinkron 5p` inject node-ot. A normál frissítés ötpercenként ismétlődik.

## FFmpeg előkészítése

Az élőkép Function a `/data/dutch-turf-camera/ffmpeg` futtatható fájlt indítja. A bináris nincs a repositoryban. A Node-RED környezetén **belül**, annak processzorarchitektúrájához illeszkedő Linux FFmpeg szükséges, RTSP/TCP bemenettel, H.264 továbbítással, MP4 muxerrel és a JPEG-végponthoz MJPEG-kódolóval.

Az eredeti iHost környezet a [ffmpeg-static rögzített b6.1.1 kiadásának](https://github.com/eugeneware/ffmpeg-static/releases/tag/b6.1.1) `ffmpeg-linux-arm.gz` állományát használta; a bináris `7.0.2-static` verziót jelentett. Más architektúrán a hozzá illő binárist válaszd. A megfelelő fájl letöltése és kibontása után helyezd el a fenti útvonalon, és állíts be a Node-RED felhasználója számára végrehajtási jogot. Az eredeti Linux telepítés jogosultságai:

```sh
chmod 700 /data/dutch-turf-camera
chmod 700 /data/dutch-turf-camera/ffmpeg
/data/dutch-turf-camera/ffmpeg -version
```

Ezek a parancsok már létező könyvtárat és binárist feltételeznek. A `node-red-contrib-rtsp-client` csomagot ez a megoldás nem használja. A videó hang nélkül, átkódolás nélkül halad át; H.265 stream helyett a kamerán H.264 streamet kell választani.

## Párosítás és működési próba

1. A Dutch Turf oldalon nyisd meg a **Biztonság** nézetet. A megjelenő hatjegyű kódot írd a `KAMERA ENGEDÉLY · ide a kijelző kódja` inject node szöveges payloadjába, majd indítsd el a node-ot. Minden böngészőt külön párosíts.
2. Ellenőrizd a kameralistát és egy kiválasztott kamera folyamatos képét. Az „Élő” jelzés lejátszható videó érkezésekor jelenik meg. A böngészőnek támogatnia kell a MediaSource API-t és a kamera H.264 profilját.
3. Visszalépéskor, bezáráskor és a böngésző háttérbe helyezésekor ellenőrizd, hogy megszűnik a videókérés. Egyszerre egy élő nézet támogatott; további kérés HTTP 429 választ kaphat.
4. Egy nem párosított böngésző ne kapjon videót. Az alapmegoldás a közvetlen HTTP-s Node-RED címre és a Function node-ok `uiPaths` listájára épül. Más URL, HTTPS vagy reverse proxy használatakor a `fromUi` eredetellenőrzést a tényleges, megbízható kiszolgálási környezethez kell igazítani; a párosítás önmagában ezt nem oldja meg.
5. A kameranézettől külön ellenőrizd a szobák állapotfrissítését és a világítás visszaigazolását. A csomagolt verzióban nincs fejlécbeli központi AUTO kapcsológomb; a fűtés engedélyezése a flow meglévő vezérlésén keresztül történik.

A részletes működés és az október 18-i ellenőrzés határai a [kameraleírásban](CAMERAS_HU.md) szerepelnek. Az NSPanel saját böngészőjén az élőkép kompatibilitását helyben kell ellenőrizni. A 2026. október 23-i csomagfrissítés nem végez új éles telepítést vagy fizikai eszközpróbát.
