const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// Cloudinary (con el preset sin firmar que usamos) rechaza archivos de más de
// 10MB. Las fotos de drone suelen venir muy por encima de eso, así que las
// redimensionamos/comprimimos en el navegador antes de subirlas.
const MAX_BYTES_CLOUDINARY = 10 * 1024 * 1024;
const MARGEN_SEGURO_BYTES = 9 * 1024 * 1024;
const ANCHOS_A_PROBAR = [4000, 3000, 2200, 1600];
const CALIDADES_A_PROBAR = [0.85, 0.75, 0.65, 0.5];

export function isCloudinaryConfigured() {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}

function conExtensionJpg(nombreArchivo: string): string {
  return `${nombreArchivo.replace(/\.[^/.]+$/, "")}.jpg`;
}

/** Redimensiona y re-comprime una imagen en el navegador hasta que pese menos
 * del límite de Cloudinary. Si no puede (o el navegador no soporta las APIs
 * necesarias), devuelve el archivo original sin tocar. No toca GIFs (perderían
 * la animación) ni archivos que no sean imagen. */
async function comprimirImagenSiHaceFalta(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size <= MAX_BYTES_CLOUDINARY) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  for (const maxAncho of ANCHOS_A_PROBAR) {
    const escala = Math.min(1, maxAncho / bitmap.width);
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, ancho, alto);

    for (const calidad of CALIDADES_A_PROBAR) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", calidad));
      if (blob && blob.size <= MARGEN_SEGURO_BYTES) {
        bitmap.close();
        return new File([blob], conExtensionJpg(file.name), { type: "image/jpeg" });
      }
    }
  }

  bitmap.close();
  return file;
}

/** Sube un archivo directamente desde el navegador usando un upload preset sin firmar. */
export async function uploadToCloudinary(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary no está configurado");
  }

  const archivoASubir = await comprimirImagenSiHaceFalta(file);

  const formData = new FormData();
  formData.append("file", archivoASubir);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Error al subir el archivo a Cloudinary");
  }

  return data.secure_url as string;
}
