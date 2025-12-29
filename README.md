# CHATAPP-PROJECT

I have built an Responsive Chat application using MERN stack where implemented socket.io for real time communication.

---

## Image Uploads (Photos)

- The backend supports sending images with messages. It will attempt to upload images to Cloudinary if you set the following environment variables in `backend/.env`:

  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`

- If Cloudinary is not configured, the server automatically saves uploaded images to `backend/public/uploads/` and serves them at `/uploads/<filename>` so photos will still work in development.

- To enable Cloudinary, create a free account at https://cloudinary.com/, then add the three keys to your `backend/.env`.

---


