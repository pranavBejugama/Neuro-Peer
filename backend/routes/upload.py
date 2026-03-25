import io
from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter()

ALLOWED_TYPES = {
    "application/pdf",
    "text/plain",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        contents = await file.read()

        if len(contents) > MAX_FILE_SIZE:
            return {"error": "File too large. Maximum size is 10 MB."}

        content_type = file.content_type or ""
        filename = file.filename or "unknown"

        # Plain text
        if content_type == "text/plain" or filename.endswith(".txt"):
            try:
                text = contents.decode("utf-8")
            except UnicodeDecodeError:
                text = contents.decode("latin-1")
            return {"content": text.strip(), "filename": filename}

        # PDF
        if content_type == "application/pdf" or filename.endswith(".pdf"):
            try:
                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(contents))
                pages_text = []
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        pages_text.append(page_text)
                text = "\n\n".join(pages_text).strip()
                if not text:
                    return {"error": "Could not extract text from PDF. The file may be image-based.", "filename": filename}
                return {"content": text, "filename": filename}
            except Exception as e:
                return {"error": f"PDF parsing failed: {str(e)}", "filename": filename}

        # Image
        if content_type.startswith("image/"):
            return {
                "content": "Image uploaded — OCR coming soon. For now, describe your image or paste the text manually.",
                "filename": filename,
            }

        return {"error": f"Unsupported file type: {content_type}", "filename": filename}

    except Exception as e:
        return {"error": f"Upload failed: {str(e)}"}
