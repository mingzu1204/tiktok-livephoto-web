# TikTok LivePhoto Web Downloader

Công cụ tải Live Photo TikTok trực tuyến chất lượng cao, hỗ trợ cả hai hệ sinh thái **Apple (iOS)** và **Android**.

## Tính Năng Chính
- **Lọc thông minh:** Tự động nhận diện bài đăng và chỉ trích xuất các slide có video Live Photo.
- **Hỗ trợ iOS:** Tự động gán mã Apple QuickTime UUID vào video MOV để ghép đôi với ảnh JPG trong thư viện Apple Photos.
- **Hỗ trợ Android:** Tự động tiêm XMP metadata (`GCamera:MotionPhoto`) và nhúng MP4 vào đuôi file JPEG, nhận diện chuyển động trên Google Photos & Samsung Gallery.
- **Xem trước trực quan:** Chạm nhẹ trên điện thoại hoặc nhấn giữ trên máy tính để xem trước chuyển động Live Photo kèm âm thanh.
- **Tùy chọn tải linh hoạt:** Tải từng ảnh trực tiếp về máy hoặc đóng gói toàn bộ vào file ZIP.

## Cài Đặt & Chạy Cục Bộ
```bash
pip install -r requirements.txt
python server.py
```
Mở trình duyệt tại: `http://127.0.0.1:5000`

## Triển Khai Lên Vercel
Dự án đã có sẵn cấu hình `vercel.json` và `api/index.py`, chỉ cần kết nối repository này với Vercel để triển khai tự động.
