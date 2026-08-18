import Link from "next/link";
import { notFound } from "next/navigation";
import { GALAXIES, GALAXY_SLUGS } from "@/lib/galaxies";
import GalaxyScene from "@/components/GalaxyScene";

export function generateStaticParams() {
  return GALAXY_SLUGS.map(slug => ({ slug }));
}

export function generateMetadata({ params }) {
  const g = GALAXIES[params.slug];
  return g ? { title: `${g.name} — everythingOS Galaxies` } : {};
}

export default function GalaxyPage({ params }) {
  const g = GALAXIES[params.slug];
  if (!g) notFound();

  return (
    <div className="gxy-root" style={{ "--accent": g.accent }}>
      <GalaxyScene cfg={g.cfg} />
      <div className="gxy-panel gxy-topleft">
        <h1>{g.name}<small>{g.subtitle}</small></h1>
        <p className="gxy-desc">{g.desc}</p>
      </div>
      <nav className="gxy-nav">
        {GALAXY_SLUGS.map(slug => (
          <Link key={slug} href={`/galaxy/${slug}`}
            className={"gxy-navlink" + (slug === params.slug ? " current" : "")}>
            {GALAXIES[slug].name}
            <span className="tag">{GALAXIES[slug].subtitle.split(" ")[0]}</span>
          </Link>
        ))}
        <Link className="gxy-navlink" href="/">⌂ everythingOS<span className="tag">desktop</span></Link>
      </nav>
      <div className="gxy-controls">
        drag — orbit · scroll — zoom · WASD — fly · shift — boost<br />
        VR: look around · squeeze trigger — drift forward
      </div>
    </div>
  );
}
