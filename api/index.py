import io
import os
import re
import sys
import uuid
import zipfile
import tempfile
import struct
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

BASE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = BASE_DIR / "public"
STATIC_DIR = BASE_DIR / "static"

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
        raise HTTPException(status_code=404, detail="Bài đăng này không chứa bất kỳ ảnh Live Photo nào! Có thể đây là bài đăng ảnh tĩnh hoặc video thông thường.")

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
                
    zip_buffer.seek(0)
    filename = f"TikTok_LivePhoto_{req.platform.upper()}_{data.get('id', 'media')}.zip"
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

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
