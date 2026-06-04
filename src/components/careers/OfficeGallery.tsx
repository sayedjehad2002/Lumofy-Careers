import { motion } from "framer-motion";

interface GalleryImage {
  src: string;
  alt: string;
  tall?: boolean;
}

const galleryImages: GalleryImage[] = [
  { src: "/placeholder.svg", alt: "Team brainstorming session", tall: true },
  { src: "/placeholder.svg", alt: "Office workspace" },
  { src: "/placeholder.svg", alt: "Team celebration" },
  { src: "/placeholder.svg", alt: "Workshop event", tall: true },
  { src: "/placeholder.svg", alt: "Team outing" },
  { src: "/placeholder.svg", alt: "Hackathon day" },
  { src: "/placeholder.svg", alt: "Company retreat", tall: true },
  { src: "/placeholder.svg", alt: "Product launch" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const OfficeGallery = () => {
  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="mb-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Office <span className="text-primary">Vibes</span>
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            A glimpse into everyday life, team moments, and the energy that drives us.
          </p>
        </motion.div>

        {/* Masonry Grid */}
        <motion.div
          className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          {galleryImages.map((img, i) => (
            <motion.div
              key={i}
              className="break-inside-avoid group relative overflow-hidden rounded-2xl"
              variants={fadeUp}
            >
              <div
                className={`relative overflow-hidden rounded-2xl bg-muted ${
                  img.tall ? "aspect-[3/4]" : "aspect-[4/3]"
                }`}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <p className="text-sm font-medium text-white">{img.alt}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default OfficeGallery;
