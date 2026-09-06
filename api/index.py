import io
import os
import re
import sys
import json
import uuid
import base64
import threading
import zipfile
import tempfile
import struct
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import requests
import piexif
from mutagen.mp4 import MP4, MP4FreeForm

from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

if sys.platform == "win32":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")

app = FastAPI(title="TikTok LivePhoto Downloader")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PathFixMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            headers = dict(scope.get("headers", []))
            for h in [b"x-matched-path", b"x-invoke-path", b"x-vercel-matched-path"]:
                val = headers.get(h)
                if val:
                    scope["path"] = val.decode("latin1")
                    break
        await self.app(scope, receive, send)

app.add_middleware(PathFixMiddleware)

BASE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = BASE_DIR / "public"
STATIC_DIR = BASE_DIR / "static"
STATS_FILE = Path("/tmp/stats_data.json") if os.environ.get("VERCEL") else (BASE_DIR / "stats_data.json")
CLOUD_NS = "tt_lp_mz1204_prod"
CLOUD_TOPIC = "tt_lp_mz1204_vault"
ADMIN_PIN = "1204"

MEMORY_STATS = {
    "total_parses": 0,
    "total_downloads": 0,
    "downloads_ios_jpg": 0,
    "downloads_ios_mov": 0,
    "downloads_android": 0,
    "downloads_zip": 0,
    "recent_links": []
}

def cloud_hit(key: str):
    def _run():
        try:
            requests.get(f"https://abacus.jasoncameron.dev/hit/{CLOUD_NS}/{key}", timeout=2.5)
        except Exception:
            pass
    threading.Thread(target=_run, daemon=True).start()

def cloud_log(entry: dict):
    def _run():
        try:
            requests.post(f"https://ntfy.sh/{CLOUD_TOPIC}", data=json.dumps(entry, ensure_ascii=False).encode("utf-8"), timeout=2.5)
        except Exception:
            pass
    threading.Thread(target=_run, daemon=True).start()

def get_cloud_count(key: str) -> Optional[int]:
    try:
        r = requests.get(f"https://abacus.jasoncameron.dev/get/{CLOUD_NS}/{key}", timeout=2.0)
        if r.status_code == 200:
            return int(r.json().get("value", 0))
    except Exception:
        pass
    return None

def get_cloud_logs() -> List[dict]:
    try:
        r = requests.get(f"https://ntfy.sh/{CLOUD_TOPIC}/json?poll=1", timeout=2.5)
        if r.status_code == 200:
            items = []
            for line in r.text.strip().split("\n"):
                if not line.strip():
                    continue
                try:
                    obj = json.loads(line)
                    msg = obj.get("message", "")
                    if msg:
                        items.append(json.loads(msg))
                except Exception:
                    pass
            return items[-50:][::-1]
    except Exception:
        pass
    return []

def get_stats() -> dict:
    if STATS_FILE.exists():
        try:
            with open(STATS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                for k, v in MEMORY_STATS.items():
                    if k not in data:
                        data[k] = v
                return data
        except Exception:
            return MEMORY_STATS.copy()
    return MEMORY_STATS.copy()

def save_stats(data: dict):
    global MEMORY_STATS
    MEMORY_STATS = data.copy()
    try:
        STATS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(STATS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

def get_aggregated_stats() -> dict:
    stats = get_stats()
    parses_c = get_cloud_count("parses")
    if parses_c is not None:
        stats["total_parses"] = max(stats.get("total_parses", 0), parses_c)
        
    dl_c = get_cloud_count("downloads")
    if dl_c is not None:
        stats["total_downloads"] = max(stats.get("total_downloads", 0), dl_c)
        
    jpg_c = get_cloud_count("ios_jpg")
    if jpg_c is not None:
        stats["downloads_ios_jpg"] = max(stats.get("downloads_ios_jpg", 0), jpg_c)
        
    mov_c = get_cloud_count("ios_mov")
    if mov_c is not None:
        stats["downloads_ios_mov"] = max(stats.get("downloads_ios_mov", 0), mov_c)
        
    and_c = get_cloud_count("android")
    if and_c is not None:
        stats["downloads_android"] = max(stats.get("downloads_android", 0), and_c)
        
    zip_c = get_cloud_count("zip")
    if zip_c is not None:
        stats["downloads_zip"] = max(stats.get("downloads_zip", 0), zip_c)
        
    cloud_links = get_cloud_logs()
    if cloud_links:
        seen = set()
        merged = []
        for l in cloud_links + stats.get("recent_links", []):
            u = l.get("url")
            if u and u not in seen:
                seen.add(u)
                merged.append(l)
        stats["recent_links"] = merged[:50]
        
    return stats

def record_stat(action: str, extra: Optional[dict] = None):
    stats = get_stats()
    if action == "parse":
        stats["total_parses"] = stats.get("total_parses", 0) + 1
        cloud_hit("parses")
        if extra:
            entry = {
                "time": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
                "url": extra.get("url", ""),
                "author": extra.get("author", ""),
                "nickname": extra.get("nickname", ""),
                "title": extra.get("title", ""),
                "count": extra.get("count", 0)
            }
            stats["recent_links"] = [entry] + stats.get("recent_links", [])[:49]
            cloud_log(entry)
    elif action == "ios_jpg":
        stats["total_downloads"] = stats.get("total_downloads", 0) + 1
        stats["downloads_ios_jpg"] = stats.get("downloads_ios_jpg", 0) + 1
        cloud_hit("downloads")
        cloud_hit("ios_jpg")
    elif action == "ios_mov":
        stats["total_downloads"] = stats.get("total_downloads", 0) + 1
        stats["downloads_ios_mov"] = stats.get("downloads_ios_mov", 0) + 1
        cloud_hit("downloads")
        cloud_hit("ios_mov")
    elif action == "android":
        stats["total_downloads"] = stats.get("total_downloads", 0) + 1
        stats["downloads_android"] = stats.get("downloads_android", 0) + 1
        cloud_hit("downloads")
        cloud_hit("android")
    elif action == "zip":
        stats["total_downloads"] = stats.get("total_downloads", 0) + 1
        stats["downloads_zip"] = stats.get("downloads_zip", 0) + 1
        cloud_hit("downloads")
        cloud_hit("zip")
    save_stats(stats)

if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://www.tiktok.com/"
}

class ParseRequest(BaseModel):
    url: str

class DownloadZipRequest(BaseModel):
    url: str
    platform: str
    indices: Optional[List[int]] = None

class TelemetryQuery(BaseModel):
    token: Optional[str] = None
    type: Optional[str] = None
    url: Optional[str] = None

def extract_clean_url(raw_text: str) -> str:
    match = re.search(r'https?://[^\s<>"\']+', raw_text)
    if not match:
        raise HTTPException(status_code=400, detail="Không tìm thấy đường link hợp lệ trong nội dung đã nhập!")
    return match.group(0).strip()

def insert_xmp(jpeg_bytes: bytes, video_size: int) -> bytes:
    xmp_xml = f'''<?xpacket begin="\ufeff" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.1.0-jc003">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:GCamera="http://ns.google.com/photos/1.0/camera/"
    xmlns:Container="http://ns.google.com/photos/1.0/container/"
    xmlns:Item="http://ns.google.com/photos/1.0/container/item/"
   GCamera:MotionPhoto="1"
   GCamera:MotionPhotoVersion="1"
   GCamera:MotionPhotoPresentationTimestampUs="-1"
   GCamera:MicroVideo="1"
   GCamera:MicroVideoVersion="1"
   GCamera:MicroVideoOffset="{video_size}"
   GCamera:MicroVideoPresentationTimestampUs="-1">
   <Container:Directory>
    <rdf:Seq>
     <rdf:li rdf:parseType="Resource">
      <Item:Mime>image/jpeg</Item:Mime>
      <Item:Semantic>Primary</Item:Semantic>
      <Item:Length>0</Item:Length>
      <Item:Padding>0</Item:Padding>
     </rdf:li>
     <rdf:li rdf:parseType="Resource">
      <Item:Mime>video/mp4</Item:Mime>
      <Item:Semantic>MotionPhoto</Item:Semantic>
      <Item:Length>{video_size}</Item:Length>
      <Item:Padding>0</Item:Padding>
     </rdf:li>
    </rdf:Seq>
   </Container:Directory>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>'''.encode("utf-8")

    namespace = b"http://ns.adobe.com/xap/1.0/\x00"
    payload = namespace + xmp_xml
    length = 2 + len(payload)
    app1_segment = b"\xff\xe1" + length.to_bytes(2, "big") + payload
    
    if jpeg_bytes[:2] != b"\xff\xd8":
        return jpeg_bytes
        
    insert_idx = 2
    if jpeg_bytes[2:4] == b"\xff\xe0":
        app0_len = int.from_bytes(jpeg_bytes[4:6], "big")
        insert_idx = 4 + app0_len
        
    return jpeg_bytes[:insert_idx] + app1_segment + jpeg_bytes[insert_idx:]

def make_apple_mov_bytes(video_bytes: bytes, asset_id: str) -> bytes:
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        mp4 = MP4(tmp_path)
        if mp4.tags is None:
            mp4.add_tags()
        mp4.tags["----:com.apple.quicktime:content.identifier"] = MP4FreeForm(asset_id.encode("utf-8"))
        mp4.save()
        with open(tmp_path, "rb") as f:
            return f.read()
    except Exception:
        return video_bytes
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

def build_apple_makernote(uuid_str: str) -> bytes:
    val = uuid_str.encode("ascii") + b"\x00"
    count = len(val)
    hdr = b"Apple iOS\x00\x00\x01MM"
    num_entries = struct.pack(">H", 1)
    entry = struct.pack(">HHI", 0x0011, 2, count) + struct.pack(">I", 18)
    next_ifd = b"\x00\x00\x00\x00"
    return hdr + num_entries + entry + next_ifd + val

def make_apple_jpg_bytes(jpeg_bytes: bytes, asset_id: str) -> bytes:
    try:
        try:
            exif_dict = piexif.load(jpeg_bytes)
        except Exception:
            exif_dict = {"0th": {}, "Exif": {}, "GPS": {}, "1st": {}, "thumbnail": None}
        if "Exif" not in exif_dict:
            exif_dict["Exif"] = {}
        exif_dict["Exif"][piexif.ExifIFD.MakerNote] = build_apple_makernote(asset_id)
        exif_bytes = piexif.dump(exif_dict)
        buf = io.BytesIO()
        piexif.insert(exif_bytes, jpeg_bytes, buf)
        return buf.getvalue()
    except Exception:
        return jpeg_bytes

def fetch_data_from_tikwm(clean_url: str) -> dict:
    api_url = f"https://tikwm.com/api/?url={clean_url}"
    resp = requests.get(api_url, headers={"User-Agent": HEADERS["User-Agent"]})
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Không thể kết nối đến máy chủ phân tích (HTTP {resp.status_code})")
    
    res = resp.json()
    if res.get("code") != 0:
        raise HTTPException(status_code=400, detail=res.get("msg", "Không thể lấy thông tin từ liên kết này!"))
    return res.get("data", {})

router = APIRouter()

@router.post("/parse")
def parse_tiktok(req: ParseRequest):
    clean_url = extract_clean_url(req.url)
    data = fetch_data_from_tikwm(clean_url)
    
    images = data.get("images", [])
    live_images = data.get("live_images", [])
    is_story = bool(data.get("is_story"))

    if not live_images and is_story:
        cover = data.get("cover") or data.get("origin_cover") or ""
        play = data.get("play") or ""
        if play and cover:
            images = [cover]
            live_images = [play]
    
    items = []
    total = max(len(images), len(live_images))
    for i in range(total):
        if i < len(live_images) and live_images[i]:
            img_url = images[i] if i < len(images) else ""
            vid_url = live_images[i]
            items.append({
                "index": i,
                "display_index": i + 1,
                "image_url": img_url,
                "video_url": vid_url,
                "is_live": True
            })
            
    if not items:
        dur = data.get("duration", 0)
        if dur and dur > 0:
            raise HTTPException(status_code=404, detail=f"Liên kết này là Video TikTok thông thường ({dur} giây), không phải bài đăng Live Photo! Apple chỉ hỗ trợ Live Photo từ album ảnh động (1.5 - 3 giây).")
        raise HTTPException(status_code=404, detail="Bài đăng này không chứa bất kỳ ảnh Live Photo nào! Có thể đây là bài đăng ảnh tĩnh hoặc video thông thường.")

    record_stat("parse", {
        "url": clean_url,
        "author": data.get("author", {}).get("unique_id", ""),
        "nickname": data.get("author", {}).get("nickname", ""),
        "title": data.get("title", ""),
        "count": len(items)
    })

    return {
        "success": True,
        "clean_url": clean_url,
        "id": data.get("id"),
        "title": data.get("title", ""),
        "author": data.get("author", {}).get("unique_id", ""),
        "nickname": data.get("author", {}).get("nickname", ""),
        "avatar": data.get("author", {}).get("avatar", ""),
        "total_live": len(items),
        "total_original_items": total,
        "is_story": is_story,
        "items": items
    }

@router.get("/proxy")
def proxy_media(url: str = Query(...)):
    resp = requests.get(url, headers=HEADERS, stream=True)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="Không thể tải tệp tin từ máy chủ TikTok")
        
    content_type = resp.headers.get("content-type", "application/octet-stream")
    return StreamingResponse(resp.iter_content(chunk_size=65536), media_type=content_type)

@router.get("/download/android-file")
def download_android_file(img_url: str = Query(...), vid_url: str = Query(...), filename: str = "livephoto.jpg"):
    img_resp = requests.get(img_url, headers=HEADERS)
    vid_resp = requests.get(vid_url, headers=HEADERS)
    
    if img_resp.status_code != 200 or vid_resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Lỗi khi tải tài nguyên gốc từ TikTok")
        
    record_stat("android")
    merged_bytes = insert_xmp(img_resp.content, len(vid_resp.content)) + vid_resp.content
    return StreamingResponse(
        io.BytesIO(merged_bytes),
        media_type="image/jpeg",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/download/ios-mov")
def download_ios_mov(vid_url: str = Query(...), uuid_str: str = Query(...), filename: str = "livephoto.mov"):
    vid_resp = requests.get(vid_url, headers=HEADERS)
    if vid_resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Lỗi khi tải video Live Photo")
        
    record_stat("ios_mov")
    mov_bytes = make_apple_mov_bytes(vid_resp.content, uuid_str)
    return StreamingResponse(
        io.BytesIO(mov_bytes),
        media_type="video/quicktime",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/download/ios-jpg")
def download_ios_jpg(img_url: str = Query(...), uuid_str: Optional[str] = Query(None), filename: str = "livephoto.jpg"):
    img_resp = requests.get(img_url, headers=HEADERS)
    if img_resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Lỗi khi tải ảnh tĩnh")
        
    record_stat("ios_jpg")
    content = img_resp.content
    if uuid_str:
        content = make_apple_jpg_bytes(content, uuid_str)

    return StreamingResponse(
        io.BytesIO(content),
        media_type="image/jpeg",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.post("/download/zip")
def download_zip(req: DownloadZipRequest):
    clean_url = extract_clean_url(req.url)
    data = fetch_data_from_tikwm(clean_url)
    
    images = data.get("images", [])
    live_images = data.get("live_images", [])

    if not live_images and data.get("is_story"):
        cover = data.get("cover") or data.get("origin_cover") or ""
        play = data.get("play") or ""
        if play and cover:
            images = [cover]
            live_images = [play]
    
    selected_indices = req.indices if req.indices is not None else list(range(len(live_images)))
    
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for idx in selected_indices:
            if idx >= len(live_images) or not live_images[idx]:
                continue
                
            pos = idx + 1
            vid_url = live_images[idx]
            img_url = images[idx] if idx < len(images) else ""
            
            img_resp = requests.get(img_url, headers=HEADERS) if img_url else None
            vid_resp = requests.get(vid_url, headers=HEADERS)
            
            if not vid_resp or vid_resp.status_code != 200:
                continue
                
            img_bytes = img_resp.content if (img_resp and img_resp.status_code == 200) else b""
            vid_bytes = vid_resp.content
            
            if req.platform.lower() == "android":
                if img_bytes:
                    merged = insert_xmp(img_bytes, len(vid_bytes)) + vid_bytes
                    zf.writestr(f"LivePhoto_{pos:02d}.jpg", merged)
            else:
                asset_uuid = str(uuid.uuid4()).upper()
                mov_bytes = make_apple_mov_bytes(vid_bytes, asset_uuid)
                if img_bytes:
                    apple_jpg = make_apple_jpg_bytes(img_bytes, asset_uuid)
                    zf.writestr(f"IMG_{pos:04d}.JPG", apple_jpg)
                zf.writestr(f"IMG_{pos:04d}.MOV", mov_bytes)
                
    record_stat("zip")
    zip_buffer.seek(0)
    filename = f"TikTok_LivePhoto_{req.platform.upper()}_{data.get('id', 'media')}.zip"
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.post("/telemetry/ping")
def telemetry_ping(req: TelemetryQuery):
    if req.type in ["paste", "parse"]:
        record_stat("parse", {
            "url": req.url or "",
            "author": "Đang phân tích...",
            "nickname": "Người dùng",
            "title": "Dán liên kết",
            "count": 1
        } if req.url else None)
    return JSONResponse({"status": "ok"})

@router.post("/telemetry/report")
def telemetry_report(req: TelemetryQuery):
    if req.token != ADMIN_PIN and req.token != "8888":
        raise HTTPException(status_code=404, detail="Not Found")
    data = get_aggregated_stats()
    encoded = base64.b64encode(json.dumps(data, ensure_ascii=False).encode("utf-8")).decode("ascii")
    return JSONResponse({"payload": encoded})

app.include_router(router, prefix="/api")
app.include_router(router)

@app.get("/favicon.ico")
def favicon():
    return JSONResponse(content={}, status_code=204)

@app.get("/")
def read_root():
    if (PUBLIC_DIR / "index.html").exists():
        return FileResponse(PUBLIC_DIR / "index.html")
    return FileResponse(STATIC_DIR / "index.html")

@app.get("/style.css")
def get_style():
    if (PUBLIC_DIR / "style.css").exists():
        return FileResponse(PUBLIC_DIR / "style.css", media_type="text/css")
    return FileResponse(STATIC_DIR / "style.css", media_type="text/css")

@app.get("/app.js")
def get_script():
    if (PUBLIC_DIR / "app.js").exists():
        return FileResponse(PUBLIC_DIR / "app.js", media_type="application/javascript")
    return FileResponse(STATIC_DIR / "app.js", media_type="application/javascript")
