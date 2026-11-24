
# Build, Break, Paint!

Trò chơi xây dựng thế giới 3D, nơi bạn có thể xây, phá và tô màu các khối.

<p align="center">
  <a href="README.md">🇬🇧 English</a> |
  <a href="README.vi.md">🇻🇳 Tiếng Việt</a> |
  <a href="README.zh.md">🇨🇳 中文</a>
</p>

<p align="center">
  <a href="https://buildbreakpaintr.up.railway.app/">
    <strong>🎮 Chơi Build, Break, Paint!</strong>
  </a>
</p>

## ✨ Tính năng

- Thế giới khối 3D
- Công cụ Xây, Phá và Tô màu
- Tùy chỉnh màu sắc khối
- Lưu và tải thế giới
- Tự động lưu
- Thế giới nhiều người chơi công khai
- Chỉnh sửa khối chung
- Đồng bộ chuyển động người chơi
- Chat nhiều người chơi theo thời gian thực
- Joystick và nút nhảy trên điện thoại
- Điều khiển bằng bàn phím
- Hỗ trợ tiếng Anh, tiếng Việt và tiếng Trung

## 🎮 Điều khiển

### Máy tính

| Phím | Chức năng |
|---|---|
| W / ↑ | Đi về phía trước |
| A / ← | Đi sang trái |
| S / ↓ | Đi về phía sau |
| D / → | Đi sang phải |
| Space | Nhảy |
| Chuột | Nhìn xung quanh và tương tác |

### Điện thoại

- Dùng joystick để di chuyển.
- Nhấn nút nhảy để nhảy.
- Chạm vào khối để tương tác.

## 🛠️ Yêu cầu

- Node.js 20.9 trở lên
- npm
- Một dự án Supabase

## 📦 Cài đặt

Sao chép repository:

```bash
git clone https://github.com/tluong-678/BuildBreakPaint.git
cd BuildBreakPaint
npm install
```

## 🔐 Cài đặt Supabase

1. Tạo dự án tại [Supabase](https://supabase.com).
2. Sao chép `.env.example` thành `.env.local`.
3. Cấu hình URL và public key của Supabase.
4. Mở SQL Editor trong Supabase.
5. Chạy nội dung SQL trong `supabase/schema.sql`.

Ví dụ `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Không đưa service-role key của Supabase vào mã chạy trên trình duyệt.

## 🚀 Chạy dự án

```bash
npm run dev
```

Mở http://localhost:3000.

## 🏗️ Build phiên bản sản xuất

```bash
npm run build
npm run start
```

## 🌐 Website chính thức

[BuildBreakPaint](https://buildbreakpaintr.up.railway.app/)

## 📁 Repository GitHub

[https://github.com/tluong-678/BuildBreakPaint](https://github.com/tluong-678/BuildBreakPaint)

## 📝 Ghi chú

Dự án vẫn đang trong quá trình phát triển.

Một số tính năng có thể cần cấu hình hoặc cải thiện thêm.

Đăng nhập Google cần cấu hình bổ sung trong Supabase và Google Cloud.
