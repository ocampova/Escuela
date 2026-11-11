/* eslint-disable @next/next/no-img-element */
import { cx } from "./ui";

/** Imágenes de un aviso a todo el ancho; tocar abre la imagen completa (para ampliar o guardar). */
export function AnnouncementImages({ images, title, className }: { images: { id: string }[]; title: string; className?: string }) {
  if (images.length === 0) return null;
  return (
    <div className={cx("space-y-3", className)}>
      {images.map((img, i) => (
        <a key={img.id} href={`/avisos/imagen/${img.id}`} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg ring-1 ring-line">
          <img src={`/avisos/imagen/${img.id}`} alt={images.length > 1 ? `${title}, imagen ${i + 1} de ${images.length}` : title} loading={i === 0 ? "eager" : "lazy"} className="w-full bg-canvas" />
        </a>
      ))}
    </div>
  );
}

/** Miniatura de la primera imagen, para listas. */
export function AnnouncementThumb({ id, className }: { id: string; className?: string }) {
  return <img src={`/avisos/imagen/${id}`} alt="" loading="lazy" className={cx("size-14 shrink-0 rounded-lg bg-canvas object-cover ring-1 ring-line", className)} />;
}
